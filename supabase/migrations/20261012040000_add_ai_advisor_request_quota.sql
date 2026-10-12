-- Only short-lived, keyed request counters are stored. No prompts, responses,
-- plans, raw network addresses, or email addresses are written here.
create table public.ai_advisor_request_usage (
  id bigint generated always as identity primary key,
  actor_kind text not null check (actor_kind in ('guest', 'user')),
  actor_key text not null check (actor_key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index ai_advisor_usage_actor_time_idx
  on public.ai_advisor_request_usage(actor_kind, actor_key, created_at desc);
create index ai_advisor_usage_time_idx
  on public.ai_advisor_request_usage(created_at desc);

alter table public.ai_advisor_request_usage enable row level security;
revoke all on public.ai_advisor_request_usage from public, anon, authenticated, service_role;
revoke all on sequence public.ai_advisor_request_usage_id_seq from public, anon, authenticated, service_role;

-- The Edge Function calls this with a server-generated HMAC key through a
-- server-side Supabase secret key. A single advisory lock makes the actor and
-- project-wide checks atomic across concurrent function instances.
create function public.consume_ai_advisor_request_quota(p_actor_kind text, p_actor_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  hourly_limit integer;
  daily_limit integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'AI quota caller is not authorized' using errcode = '42501';
  end if;
  if p_actor_kind not in ('guest', 'user') or p_actor_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid AI quota actor' using errcode = '22023';
  end if;

  hourly_limit := case when p_actor_kind = 'guest' then 5 else 20 end;
  daily_limit := case when p_actor_kind = 'guest' then 20 else 60 end;

  perform pg_catalog.pg_advisory_xact_lock(821048);
  delete from public.ai_advisor_request_usage
    where created_at <= now() - interval '1 day';

  if (select count(*) from public.ai_advisor_request_usage
      where created_at > now() - interval '1 minute') >= 20
    or (select count(*) from public.ai_advisor_request_usage
      where created_at > now() - interval '1 day') >= 800
    or (select count(*) from public.ai_advisor_request_usage
      where actor_kind = p_actor_kind and actor_key = p_actor_key
        and created_at > now() - interval '1 hour') >= hourly_limit
    or (select count(*) from public.ai_advisor_request_usage
      where actor_kind = p_actor_kind and actor_key = p_actor_key
        and created_at > now() - interval '1 day') >= daily_limit then
    return false;
  end if;

  insert into public.ai_advisor_request_usage(actor_kind, actor_key)
    values (p_actor_kind, p_actor_key);
  return true;
end;
$$;

revoke all on function public.consume_ai_advisor_request_quota(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_ai_advisor_request_quota(text, text)
  to service_role;
