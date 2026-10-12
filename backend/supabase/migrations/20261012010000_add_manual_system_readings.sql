-- Keep saved backup_plans as the canonical system configuration.
-- Readings store only user-entered measurements and reference that saved plan.
create unique index if not exists backup_plans_id_user_id_key
  on public.backup_plans(id, user_id);

create table if not exists public.system_readings (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at timestamptz not null,
  battery_percentage numeric(5,2) check (battery_percentage between 0 and 100),
  battery_voltage numeric(8,2) check (battery_voltage > 0 and battery_voltage <= 1000),
  load_watts numeric(10,2) check (load_watts between 0 and 1000000),
  solar_generation_watts numeric(10,2) check (solar_generation_watts between 0 and 1000000),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint system_readings_system_owner_fk
    foreign key (system_id, user_id)
    references public.backup_plans(id, user_id)
    on delete cascade,
  constraint system_readings_has_measurement_check
    check (battery_percentage is not null or battery_voltage is not null or load_watts is not null or solar_generation_watts is not null)
);

create index if not exists system_readings_owner_system_time_idx
  on public.system_readings(user_id, system_id, recorded_at desc);

create or replace function public.validate_system_reading_compatibility()
returns trigger language plpgsql set search_path = '' as $$
declare
  system_type text;
  system_has_battery boolean;
begin
  select coalesce(p.backup_configuration ->> 'backupType', ''),
         coalesce(p.backup_configuration ->> 'hasBattery', 'false') = 'true'
    into system_type, system_has_battery
  from public.backup_plans p
  where p.id = new.system_id and p.user_id = new.user_id;

  if new.solar_generation_watts is not null and system_type <> 'solar' then
    raise exception 'Solar generation readings require a solar system';
  end if;
  if not system_has_battery and (new.battery_percentage is not null or new.battery_voltage is not null) then
    raise exception 'Battery readings require a system with a battery';
  end if;
  return new;
end;
$$;
create trigger system_readings_validate_compatibility
  before insert or update on public.system_readings
  for each row execute function public.validate_system_reading_compatibility();

alter table public.system_readings enable row level security;
create policy "Users can read their own system readings"
  on public.system_readings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can add readings to their own systems"
  on public.system_readings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own system readings"
  on public.system_readings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own system readings"
  on public.system_readings for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.system_readings to authenticated;
