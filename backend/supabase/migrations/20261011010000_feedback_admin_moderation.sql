-- Database-owned administrator allowlist. Client roles receive no access to this table.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated, service_role;

-- Column grants avoid exposing fields users do not need to write. RLS remains
-- the row boundary; triggers additionally guard moderation and ownership.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

revoke insert, update on public.backup_plans from authenticated;
grant insert (user_id, plan_name, backup_configuration, selected_appliances, calculation_results) on public.backup_plans to authenticated;
grant update (plan_name, backup_configuration, selected_appliances, calculation_results) on public.backup_plans to authenticated;

revoke insert, update on public.feedback from authenticated;
grant insert (user_id, rating, comment, feedback_type) on public.feedback to authenticated;
grant update (rating, comment, feedback_type, status) on public.feedback to authenticated;

create or replace function public.is_feedback_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users admins
    where admins.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_feedback_admin() from public, anon;
grant execute on function public.is_feedback_admin() to authenticated;

-- Restrict the earlier per-user SECURITY DEFINER RPC to signed-in users.
revoke all on function public.get_my_feedback() from public, anon;
grant execute on function public.get_my_feedback() to authenticated;

drop policy if exists "Administrators can read feedback for moderation" on public.feedback;
create policy "Administrators can read feedback for moderation"
  on public.feedback for select to authenticated
  using (public.is_feedback_admin());

drop policy if exists "Administrators can moderate feedback" on public.feedback;
create policy "Administrators can moderate feedback"
  on public.feedback for update to authenticated
  using (public.is_feedback_admin())
  with check (public.is_feedback_admin());

create or replace function public.prevent_feedback_moderation_edits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Feedback owner cannot be changed';
  end if;

  -- Trusted SQL/service-role maintenance has no end-user JWT; keep that path
  -- moderation-only as well. Browser roles cannot write without a user JWT.
  if (select auth.uid()) is null then
    if new.rating is distinct from old.rating
      or new.comment is distinct from old.comment
      or new.feedback_type is distinct from old.feedback_type then
      raise exception 'Privileged moderation may only change feedback status';
    end if;
    return new;
  end if;

  if public.is_feedback_admin() then
    if new.rating is distinct from old.rating
      or new.comment is distinct from old.comment
      or new.feedback_type is distinct from old.feedback_type then
      raise exception 'Administrators may only change feedback moderation status';
    end if;
  elsif new.status is distinct from old.status then
    raise exception 'Feedback moderation status can only be changed by an administrator';
  elsif old.status <> 'pending' and (
    new.rating is distinct from old.rating
    or new.comment is distinct from old.comment
    or new.feedback_type is distinct from old.feedback_type
  ) then
    -- A reviewed item must be reviewed again after its author edits it.
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create or replace function public.limit_feedback_rate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Serialize a user's concurrent submissions so requests cannot race past the cap.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.feedback f where f.user_id = new.user_id and f.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Feedback rate limit reached. Please try again later';
  end if;
  return new;
end;
$$;

-- Trigger functions and internal helpers are not browser RPCs.
revoke all on function public.prevent_feedback_moderation_edits() from public, anon, authenticated;
revoke all on function public.limit_feedback_rate() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
