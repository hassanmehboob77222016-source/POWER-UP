-- Saved plans are written directly by authenticated browser clients. Keep the
-- existing owner RLS and column grants, but reject oversized or unusable JSON.
-- Measure the canonical PostgreSQL jsonb text representation in UTF-8 bytes.

create schema if not exists powerup_private;
revoke all on schema powerup_private from public, anon;
grant usage on schema powerup_private to authenticated, service_role;

create function powerup_private.valid_plan_appliances(items jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  item jsonb;
begin
  if pg_catalog.jsonb_typeof(items) is distinct from 'array' then return false; end if;
  if pg_catalog.octet_length(items::text) > 131072 then return false; end if;

  for item in select value from pg_catalog.jsonb_array_elements(items) loop
    if pg_catalog.jsonb_typeof(item) is distinct from 'object' then return false; end if;
    if pg_catalog.jsonb_typeof(item -> 'applianceId') is distinct from 'string' then return false; end if;
    if pg_catalog.jsonb_typeof(item -> 'quantity') is distinct from 'number' then return false; end if;
    -- The calculator treats zero and negative quantities as zero load. Keep
    -- the database shape check aligned with the TypeScript number type.
    if item ? 'customName' and pg_catalog.jsonb_typeof(item -> 'customName') <> 'string' then return false; end if;
    if item ? 'customWatts' and pg_catalog.jsonb_typeof(item -> 'customWatts') <> 'number' then return false; end if;
    if item ? 'watts' and pg_catalog.jsonb_typeof(item -> 'watts') <> 'number' then return false; end if;
    if item ? 'surgeWatts' and pg_catalog.jsonb_typeof(item -> 'surgeWatts') <> 'number' then return false; end if;
    if item ? 'operatingHours' and pg_catalog.jsonb_typeof(item -> 'operatingHours') <> 'number' then return false; end if;
    if item ? 'mustRun' and pg_catalog.jsonb_typeof(item -> 'mustRun') <> 'boolean' then return false; end if;
    if item ? 'priority' and (pg_catalog.jsonb_typeof(item -> 'priority') <> 'string'
      or item ->> 'priority' not in ('critical', 'high', 'normal', 'low')) then return false; end if;
  end loop;
  return true;
end;
$$;

create function powerup_private.valid_plan_configuration(configuration jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if pg_catalog.jsonb_typeof(configuration) is distinct from 'object' then return false; end if;
  if pg_catalog.octet_length(configuration::text) > 131072 then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'backupType') is distinct from 'string'
    or configuration ->> 'backupType' not in ('inverter', 'solar', 'generator', 'none') then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'hasBattery') is distinct from 'boolean' then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'batteryChemistry') is distinct from 'string'
    or configuration ->> 'batteryChemistry' not in ('lifepo4', 'lead_acid', 'agm', 'unknown') then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'voltage') is distinct from 'number' then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'ampHours') is distinct from 'number' then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'directKwh') is distinct from 'number'
    and pg_catalog.jsonb_typeof(configuration -> 'directKwh') is distinct from 'null' then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'isCapacityUnknown') is distinct from 'boolean' then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'inverterRatingWatts') is distinct from 'number'
    and pg_catalog.jsonb_typeof(configuration -> 'inverterRatingWatts') is distinct from 'null' then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'typicalOutageHours') is distinct from 'number' then return false; end if;
  if pg_catalog.jsonb_typeof(configuration -> 'priorityMode') is distinct from 'string'
    or configuration ->> 'priorityMode' not in ('maximum_runtime', 'balanced', 'critical_only') then return false; end if;
  if powerup_private.valid_plan_appliances(configuration -> 'selectedAppliances') is distinct from true then return false; end if;

  -- These fields are optional in SetupInputs; null is supported for optional
  -- equipment specifications supplied by the wizard and AI Advisor.
  if configuration ? 'inverterRatingVA' and pg_catalog.jsonb_typeof(configuration -> 'inverterRatingVA') not in ('number', 'null') then return false; end if;
  if configuration ? 'inverterSurgeWatts' and pg_catalog.jsonb_typeof(configuration -> 'inverterSurgeWatts') not in ('number', 'null') then return false; end if;
  if configuration ? 'solarPanelCount' and pg_catalog.jsonb_typeof(configuration -> 'solarPanelCount') not in ('number', 'null') then return false; end if;
  if configuration ? 'solarPanelWatts' and pg_catalog.jsonb_typeof(configuration -> 'solarPanelWatts') not in ('number', 'null') then return false; end if;
  if configuration ? 'notes' and pg_catalog.jsonb_typeof(configuration -> 'notes') <> 'string' then return false; end if;
  return true;
end;
$$;

create function powerup_private.valid_plan_results(results jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  calculation jsonb;
  advice jsonb;
begin
  if pg_catalog.jsonb_typeof(results) is distinct from 'object' then return false; end if;
  if pg_catalog.octet_length(results::text) > 262144 then return false; end if;
  calculation := results -> 'calculation';
  advice := results -> 'advice';
  if pg_catalog.jsonb_typeof(calculation) is distinct from 'object'
    or pg_catalog.jsonb_typeof(advice) is distinct from 'object' then return false; end if;
  -- My Plans reads these saved result fields. Other result values are recalculated
  -- when a plan is opened or viewed in Monitoring.
  if pg_catalog.jsonb_typeof(calculation -> 'isCalculable') is distinct from 'boolean' then return false; end if;
  if pg_catalog.jsonb_typeof(calculation -> 'usableCapacityWh') is distinct from 'number'
    and pg_catalog.jsonb_typeof(calculation -> 'usableCapacityWh') is distinct from 'null' then return false; end if;
  if pg_catalog.jsonb_typeof(advice -> 'verdictTitle') is distinct from 'string' then return false; end if;
  if pg_catalog.jsonb_typeof(advice -> 'verdictDescription') is distinct from 'string' then return false; end if;
  if pg_catalog.jsonb_typeof(advice -> 'tacticalRecommendations') is distinct from 'array' then return false; end if;
  if pg_catalog.jsonb_typeof(advice -> 'timelineSchedule') is distinct from 'array' then return false; end if;
  if pg_catalog.jsonb_typeof(advice -> 'assumptionsNotes') is distinct from 'array' then return false; end if;
  return true;
end;
$$;

revoke all on function powerup_private.valid_plan_appliances(jsonb) from public, anon;
revoke all on function powerup_private.valid_plan_configuration(jsonb) from public, anon;
revoke all on function powerup_private.valid_plan_results(jsonb) from public, anon;
grant execute on function powerup_private.valid_plan_appliances(jsonb) to authenticated, service_role;
grant execute on function powerup_private.valid_plan_configuration(jsonb) to authenticated, service_role;
grant execute on function powerup_private.valid_plan_results(jsonb) to authenticated, service_role;

alter table public.backup_plans
  add constraint backup_plans_00_configuration_size_check check (pg_catalog.octet_length(backup_configuration::text) <= 131072),
  add constraint backup_plans_01_appliances_size_check check (pg_catalog.octet_length(selected_appliances::text) <= 131072),
  add constraint backup_plans_02_results_size_check check (pg_catalog.octet_length(calculation_results::text) <= 262144),
  add constraint backup_plans_10_configuration_shape_check check (powerup_private.valid_plan_configuration(backup_configuration)),
  add constraint backup_plans_11_appliances_shape_check check (powerup_private.valid_plan_appliances(selected_appliances)),
  add constraint backup_plans_12_results_shape_check check (powerup_private.valid_plan_results(calculation_results));
