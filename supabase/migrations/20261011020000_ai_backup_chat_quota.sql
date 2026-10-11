-- Chat requests are recorded server-side to enforce a per-account usage cap.
create table if not exists public.ai_chat_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_chat_usage_user_created_idx on public.ai_chat_usage(user_id, created_at desc);
alter table public.ai_chat_usage enable row level security;
revoke all on public.ai_chat_usage from public, anon, authenticated, service_role;

create or replace function public.consume_ai_chat_quota()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Sign in to use the AI Backup Advisor';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 821046));
  delete from public.ai_chat_usage where user_id = caller_id and created_at <= now() - interval '1 day';

  if (select count(*) from public.ai_chat_usage where user_id = caller_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'AI chat limit reached. Please try again later.';
  end if;

  if (select count(*) from public.ai_chat_usage where user_id = caller_id and created_at > now() - interval '1 day') >= 100 then
    raise exception 'Daily AI chat limit reached. Please try again tomorrow.';
  end if;

  insert into public.ai_chat_usage(user_id) values (caller_id);
end;
$$;
revoke all on function public.consume_ai_chat_quota() from public, anon;
grant execute on function public.consume_ai_chat_quota() to authenticated;
