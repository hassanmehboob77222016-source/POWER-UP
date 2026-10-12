-- The rate-limit trigger must count a user's submissions, but client roles
-- intentionally do not have SELECT permission on feedback.user_id. Run this
-- narrowly scoped trigger function with its migration owner privileges instead
-- of granting clients access to private owner IDs.
create or replace function public.limit_feedback_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  -- Do not let the privileged trigger become an oracle for another user's
  -- submission count; RLS also enforces this on the eventual insert.
  if caller_id is not null and caller_id is distinct from new.user_id then
    raise exception 'Feedback owner must match the signed-in user';
  end if;

  -- Serialize a user's concurrent submissions so requests cannot race past the cap.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );
  if (
    select count(*)
    from public.feedback f
    where f.user_id = new.user_id
      and f.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Feedback rate limit reached. Please try again later';
  end if;
  return new;
end;
$$;

-- Trigger invocation does not require client EXECUTE privileges.
revoke all on function public.limit_feedback_rate() from public, anon, authenticated;
