-- Remove quota objects that were exclusive to the retired conversational advisor.
-- Review existing deployment state before applying: these tables contain only
-- short-lived request timestamps/fingerprints, and this drops those records.
-- CASCADE is intentionally omitted so unexpected database dependencies stop this migration.
begin;

drop function if exists public.consume_ai_guest_chat_quota(text);
drop function if exists public.consume_ai_chat_quota();
drop table if exists public.ai_guest_chat_usage;
drop table if exists public.ai_chat_usage;

commit;
