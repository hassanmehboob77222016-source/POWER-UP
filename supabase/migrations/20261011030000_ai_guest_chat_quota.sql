-- Guest AI requests use a keyed, server-generated network fingerprint. The
-- browser receives neither the fingerprint secret nor access to this table.
create table if not exists public.ai_guest_chat_usage (
  id bigint generated always as identity primary key,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index if not exists ai_guest_chat_usage_fingerprint_created_idx
  on public.ai_guest_chat_usage(fingerprint, created_at desc);
create index if not exists ai_guest_chat_usage_created_idx
  on public.ai_guest_chat_usage(created_at);

alter table public.ai_guest_chat_usage enable row level security;
revoke all on public.ai_guest_chat_usage from public, anon, authenticated, service_role;

create or replace function public.consume_ai_guest_chat_quota(p_fingerprint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.role(), '');
begin
  if caller_role <> 'service_role' then
    raise exception 'Not authorized to consume guest AI quota';
  end if;
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid guest rate-limit fingerprint';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint, 821047));
  delete from public.ai_guest_chat_usage
  where created_at <= now() - interval '1 day';

  if (select count(*) from public.ai_guest_chat_usage
      where fingerprint = p_fingerprint and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Guest AI chat limit reached. Please try again later.';
  end if;
  if (select count(*) from public.ai_guest_chat_usage
      where fingerprint = p_fingerprint and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Guest daily AI chat limit reached. Please try again tomorrow or sign in for your account limit.';
  end if;

  insert into public.ai_guest_chat_usage(fingerprint) values (p_fingerprint);
end;
$$;

revoke all on function public.consume_ai_guest_chat_quota(text) from public, anon, authenticated;
grant execute on function public.consume_ai_guest_chat_quota(text) to service_role;
