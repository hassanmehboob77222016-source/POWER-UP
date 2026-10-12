create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_name text not null check (char_length(plan_name) between 1 and 80),
  backup_configuration jsonb not null,
  selected_appliances jsonb not null default '[]'::jsonb,
  calculation_results jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists backup_plans_user_updated_idx on public.backup_plans(user_id, updated_at desc);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 5 and 2000),
  feedback_type text not null default 'general' check (feedback_type in ('general', 'bug', 'feature', 'suggestion')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_public_recent_idx on public.feedback(status, created_at desc);
create index if not exists feedback_owner_recent_idx on public.feedback(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger backup_plans_set_updated_at before update on public.backup_plans for each row execute function public.set_updated_at();
create trigger feedback_set_updated_at before update on public.feedback for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, case
    when char_length(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), '')) >= 2 then btrim(new.raw_user_meta_data ->> 'display_name')
    when char_length(split_part(coalesce(new.email, ''), '@', 1)) >= 2 then split_part(new.email, '@', 1)
    else 'PowerUp user'
  end)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute function public.create_profile_for_new_user();

create or replace function public.prevent_feedback_moderation_edits()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (new.user_id <> old.user_id or new.status <> old.status) then
    raise exception 'Feedback owner and moderation status cannot be changed';
  end if;
  return new;
end;
$$;
create trigger feedback_protect_moderation before update on public.feedback for each row execute function public.prevent_feedback_moderation_edits();

create or replace function public.limit_feedback_rate()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.feedback f where f.user_id = new.user_id and f.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Feedback rate limit reached. Please try again later';
  end if;
  return new;
end;
$$;
create trigger feedback_rate_limit before insert on public.feedback for each row execute function public.limit_feedback_rate();

create or replace function public.get_my_feedback()
returns table(id uuid, rating smallint, comment text, feedback_type text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id, f.rating, f.comment, f.feedback_type, f.status, f.created_at
  from public.feedback f
  where f.user_id = (select auth.uid())
  order by f.created_at desc
  limit 20;
$$;

alter table public.profiles enable row level security;
alter table public.backup_plans enable row level security;
alter table public.feedback enable row level security;

create policy "Profiles are private to their owner" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users can read their own plans" on public.backup_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own plans" on public.backup_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own plans" on public.backup_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own plans" on public.backup_plans for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Anyone can read approved feedback" on public.feedback for select to anon, authenticated using (status = 'approved');
create policy "Users can read all their own feedback" on public.feedback for select to authenticated using ((select auth.uid()) = user_id);
create policy "Signed-in users can submit feedback" on public.feedback for insert to authenticated with check ((select auth.uid()) = user_id and status = 'pending');
create policy "Users can edit their own feedback" on public.feedback for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own feedback" on public.feedback for delete to authenticated using ((select auth.uid()) = user_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.backup_plans to authenticated;
revoke select on public.feedback from anon, authenticated;
grant select (id, rating, comment, feedback_type, status, created_at, updated_at) on public.feedback to anon, authenticated;
grant insert, update, delete on public.feedback to authenticated;
revoke all on function public.get_my_feedback() from public, anon;
grant execute on function public.get_my_feedback() to authenticated;
