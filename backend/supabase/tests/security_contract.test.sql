-- Run with `supabase test db` after applying all migrations to a local Supabase stack.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(60);

-- Minimal Supabase Auth fixtures; the profile creation trigger also runs here.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'powerup-test-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Test User A"}', now(), now()),
('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'powerup-test-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Test User B"}', now(), now()),
('30000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'powerup-test-admin@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Test Admin"}', now(), now());

insert into public.backup_plans (id, user_id, plan_name, backup_configuration, selected_appliances, calculation_results) values
('a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'User A Plan', '{"backupType":"inverter","hasBattery":true}', '[]', '{}'),
('b2000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'User B Plan', '{"backupType":"solar","hasBattery":true}', '[]', '{}');
insert into public.system_readings (id, system_id, user_id, recorded_at, battery_percentage, load_watts) values
('a3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', now(), 74, 420),
('b4000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', now(), 51, 680);
insert into public.feedback (id, user_id, rating, comment, feedback_type) values
('c1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 5, 'Pending comment from user A', 'general'),
('d2000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 4, 'Pending comment from user B', 'suggestion');
insert into public.admin_users (user_id) values ('30000000-0000-4000-8000-000000000003');

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.backup_plans'::regclass), 'backup_plans has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.system_readings'::regclass), 'system readings have RLS enabled');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.system_readings'::regclass and tgname = 'system_readings_validate_compatibility' and not tgisinternal), 'system reading fields are checked against their saved configuration');
select ok((select relrowsecurity from pg_class where oid = 'public.feedback'::regclass), 'feedback has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.admin_users'::regclass), 'admin_users has RLS enabled');
select ok(not has_table_privilege('anon', 'public.admin_users', 'select'), 'anonymous users cannot read administrator assignments');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'select'), 'signed-in users cannot read administrator assignments');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'insert'), 'signed-in users cannot grant administrator access');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'delete'), 'signed-in users cannot revoke or alter administrator access');
select ok(not has_table_privilege('service_role', 'public.admin_users', 'select'), 'service clients have no direct access to the admin allowlist');
select ok(not has_column_privilege('anon', 'public.feedback', 'user_id', 'select'), 'public feedback API does not expose user ids');
select ok(not has_function_privilege('anon', 'public.get_my_feedback()', 'execute'), 'anonymous users cannot execute the private feedback RPC');
select ok(has_function_privilege('authenticated', 'public.get_my_feedback()', 'execute'), 'signed-in users can call their own feedback RPC');
select ok(not has_function_privilege('anon', 'public.is_feedback_admin()', 'execute'), 'anonymous users cannot call the admin authorization helper');
select ok(has_function_privilege('authenticated', 'public.is_feedback_admin()', 'execute'), 'signed-in sessions can check admin authorization');
select ok(not has_column_privilege('authenticated', 'public.feedback', 'status', 'insert'), 'feedback submitters cannot set moderation status during insert');
select ok(not has_column_privilege('authenticated', 'public.feedback', 'created_at', 'update'), 'feedback submitters cannot rewrite creation timestamps');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'feedback' and policyname = 'Administrators can moderate feedback'), 'feedback moderation is guarded by an administrator RLS policy');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.feedback'::regclass and tgname = 'feedback_protect_moderation' and not tgisinternal), 'feedback moderation trigger is installed');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.feedback'::regclass and tgname = 'feedback_rate_limit' and not tgisinternal), 'feedback submission rate limit trigger is installed');
select ok(position('new.status := ''pending''' in pg_get_functiondef('public.prevent_feedback_moderation_edits()'::regprocedure)) > 0, 'editing reviewed feedback sends it back to pending');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.backup_plans), 1, 'user A sees only their own saved plan');
select ok(has_column_privilege('authenticated', 'public.backup_plans', 'id', 'insert'), 'authenticated users may insert a stable plan ID');
select ok(not has_table_privilege('authenticated', 'public.backup_plans', 'insert'), 'plan creation remains limited to column grants instead of broad table insert');
insert into public.backup_plans (id, user_id, plan_name, backup_configuration, selected_appliances, calculation_results)
values ('a6000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'User A Client Plan', '{"backupType":"inverter","hasBattery":true}', '[]', '{}');
select is((select count(*)::integer from public.backup_plans where id = 'a6000000-0000-4000-8000-000000000006'), 1, 'authenticated user can create a plan using a stable ID');
insert into public.backup_plans (id, user_id, plan_name, backup_configuration, selected_appliances, calculation_results)
values ('a6000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'User A Client Plan retry', '{"backupType":"inverter","hasBattery":true}', '[]', '{}')
on conflict (id) do update set plan_name = excluded.plan_name;
select is((select count(*)::integer from public.backup_plans where id = 'a6000000-0000-4000-8000-000000000006'), 1, 'retrying the same stable ID updates one row instead of creating a duplicate');
select is((select count(*)::integer from public.system_readings), 1, 'user A sees only readings linked to their own systems');
select is((select count(*)::integer from public.system_readings where id = 'b4000000-0000-4000-8000-000000000002'), 0, 'user A cannot read user B readings');
select throws_ok($$insert into public.system_readings (id, system_id, user_id, recorded_at, load_watts) values ('a5000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', now(), 100)$$, '23503', 'insert or update on table "system_readings" violates foreign key constraint "system_readings_system_owner_fk"', 'a user cannot attach their reading to another user system');
insert into public.system_readings (id, system_id, user_id, recorded_at, battery_percentage, load_watts) values ('a3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', now(), 73, 430) on conflict (id) do nothing;
select is((select count(*)::integer from public.system_readings where id = 'a3000000-0000-4000-8000-000000000001'), 1, 'retries using a stable reading id do not create duplicate readings');
select throws_ok($$insert into public.system_readings (system_id, user_id, recorded_at) values ('a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', now())$$, '23514', 'new row for relation "system_readings" violates check constraint "system_readings_has_measurement_check"', 'a reading without a measured value is rejected');
select throws_ok($$insert into public.system_readings (system_id, user_id, recorded_at, battery_percentage) values ('a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', now(), 101)$$, '23514', 'new row for relation "system_readings" violates check constraint "system_readings_battery_percentage_check"', 'battery percentage outside 0 to 100 is rejected');
select throws_ok($$insert into public.system_readings (system_id, user_id, recorded_at, solar_generation_watts) values ('a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', now(), 300)$$, 'P0001', 'Solar generation readings require a solar system', 'solar measurements are rejected for systems without solar');
select is((select count(*)::integer from public.backup_plans where id = 'b2000000-0000-4000-8000-000000000002'), 0, 'user A cannot read user B plan');
select is((with changed as (update public.backup_plans set plan_name = 'stolen' where id = 'b2000000-0000-4000-8000-000000000002' returning id) select count(*)::integer from changed), 0, 'user A cannot update user B plan');
select is((with removed as (delete from public.backup_plans where id = 'b2000000-0000-4000-8000-000000000002' returning id) select count(*)::integer from removed), 0, 'user A cannot delete user B plan');
select is((select count(*)::integer from public.feedback where id = 'd2000000-0000-4000-8000-000000000002'), 0, 'user A cannot read user B pending feedback');
select is((with changed as (update public.feedback set comment = 'tampered comment' where id = 'd2000000-0000-4000-8000-000000000002' returning id) select count(*)::integer from changed), 0, 'user A cannot update user B feedback');
select is((with removed as (delete from public.feedback where id = 'd2000000-0000-4000-8000-000000000002' returning id) select count(*)::integer from removed), 0, 'user A cannot delete user B feedback');
select throws_ok($$update public.feedback set status = 'approved' where id = 'c1000000-0000-4000-8000-000000000001'$$, 'P0001', 'Feedback moderation status can only be changed by an administrator', 'a user cannot approve their own feedback');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.backup_plans), 1, 'user B sees only their own saved plan');
select is((select count(*)::integer from public.backup_plans where id = 'a6000000-0000-4000-8000-000000000006'), 0, 'user B cannot access the plan created by user A');
select is((select count(*)::integer from public.system_readings), 1, 'user B sees only readings linked to their own systems');
select is((select count(*)::integer from public.system_readings where id = 'a3000000-0000-4000-8000-000000000001'), 0, 'user B cannot read user A readings');
select is((select count(*)::integer from public.backup_plans where id = 'a1000000-0000-4000-8000-000000000001'), 0, 'user B cannot read user A plan');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select ok(public.is_feedback_admin(), 'allowlisted administrator passes the database authorization check');
select is((select count(*)::integer from public.feedback where status = 'pending'), 2, 'administrator can review all pending feedback');
update public.feedback set status = 'approved' where id = 'c1000000-0000-4000-8000-000000000001';
select is((select status from public.feedback where id = 'c1000000-0000-4000-8000-000000000001'), 'approved', 'administrator can approve a pending item');
select throws_ok($$update public.feedback set comment = 'admin edited content' where id = 'c1000000-0000-4000-8000-000000000001'$$, 'P0001', 'Administrators may only change feedback moderation status', 'moderator cannot rewrite comment content');

set local role anon;
select is((select count(*)::integer from public.feedback where id = 'c1000000-0000-4000-8000-000000000001'), 1, 'anonymous visitor can read approved feedback');
select is((select count(*)::integer from public.feedback where id = 'd2000000-0000-4000-8000-000000000002'), 0, 'anonymous visitor cannot read pending feedback');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
update public.feedback set comment = 'Edited after approval by owner' where id = 'c1000000-0000-4000-8000-000000000001';
select is((select status from public.feedback where id = 'c1000000-0000-4000-8000-000000000001'), 'pending', 'owner edits to approved feedback require moderation again');
insert into public.feedback (user_id, rating, comment, feedback_type) values
('10000000-0000-4000-8000-000000000001', 5, 'Rate check submission two', 'general'),
('10000000-0000-4000-8000-000000000001', 5, 'Rate check submission three', 'general'),
('10000000-0000-4000-8000-000000000001', 5, 'Rate check submission four', 'general'),
('10000000-0000-4000-8000-000000000001', 5, 'Rate check submission five', 'general');
select throws_ok($$insert into public.feedback (user_id, rating, comment, feedback_type) values ('10000000-0000-4000-8000-000000000001', 5, 'Rate check submission six', 'general')$$, 'P0001', 'Feedback rate limit reached. Please try again later', 'a sixth submission within one hour is rejected');

select ok((select relrowsecurity from pg_class where oid = 'public.ai_advisor_request_usage'::regclass), 'AI request quota metadata has RLS enabled');
select ok(not has_table_privilege('anon', 'public.ai_advisor_request_usage', 'select'), 'guests cannot read quota metadata');
select ok(not has_function_privilege('authenticated', 'public.consume_ai_advisor_request_quota(text, text)', 'execute'), 'users cannot invoke the privileged AI quota function');
select ok(has_function_privilege('service_role', 'public.consume_ai_advisor_request_quota(text, text)', 'execute'), 'server role can consume AI quota');
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select ok((select bool_and(public.consume_ai_advisor_request_quota('guest', repeat('a', 64))) from generate_series(1, 5)), 'first five guest requests are allowed');
select ok(not public.consume_ai_advisor_request_quota('guest', repeat('a', 64)), 'sixth guest request is limited');

select * from finish();
rollback;
