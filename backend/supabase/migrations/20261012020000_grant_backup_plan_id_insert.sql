-- The app supplies a stable UUID for safe retries when creating a saved plan.
-- Keep all other plan insert columns restricted by the existing column grants,
-- and retain the backup_plans owner RLS policy as the row-level boundary.
grant insert (id) on table public.backup_plans to authenticated;
