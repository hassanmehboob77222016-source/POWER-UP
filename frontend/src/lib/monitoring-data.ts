import type { SetupInputs } from '@/lib/calculations'

export interface ManualMeasurementValues {
  battery_percentage: number | null
  battery_voltage: number | null
  load_watts: number | null
  solar_generation_watts: number | null
}

export interface TrendPoint { id: string; recordedAt: string; value: number }

export function getNominalCapacityWh(inputs: SetupInputs): number | null {
  if (!inputs.hasBattery || inputs.backupType === 'none' || inputs.isCapacityUnknown) return null
  if (inputs.directKwh !== null && inputs.directKwh > 0) return inputs.directKwh * 1000
  if (inputs.voltage > 0 && inputs.ampHours > 0) return inputs.voltage * inputs.ampHours
  return null
}

export function validateManualReading(inputs: SetupInputs, values: ManualMeasurementValues, timestamp: Date, now = Date.now()): string | null {
  if (Object.values(values).every(value => value === null)) return 'Enter at least one measured value.'
  if (values.battery_percentage !== null && (!Number.isFinite(values.battery_percentage) || values.battery_percentage < 0 || values.battery_percentage > 100)) return 'Battery charge must be between 0 and 100%.'
  if (values.battery_voltage !== null && (!Number.isFinite(values.battery_voltage) || values.battery_voltage <= 0 || values.battery_voltage > 1000)) return 'Battery voltage must be greater than 0 and at most 1000 V.'
  if (values.load_watts !== null && (!Number.isFinite(values.load_watts) || values.load_watts < 0 || values.load_watts > 1000000)) return 'Load must be between 0 and 1,000,000 W.'
  if (values.solar_generation_watts !== null && (!Number.isFinite(values.solar_generation_watts) || values.solar_generation_watts < 0 || values.solar_generation_watts > 1000000)) return 'Solar generation must be between 0 and 1,000,000 W.'
  if (!inputs.hasBattery && (values.battery_percentage !== null || values.battery_voltage !== null)) return 'Battery readings are unavailable for this system configuration.'
  if (inputs.backupType !== 'solar' && values.solar_generation_watts !== null) return 'Solar generation can only be recorded for a solar system.'
  if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() > now + 5 * 60 * 1000) return 'Choose a valid reading time no later than five minutes in the future.'
  return null
}

export function getTrendPoints<T extends { id: string; recorded_at: string }>(readings: T[], selectValue: (reading: T) => number | null): TrendPoint[] {
  return readings
    .filter(reading => selectValue(reading) !== null)
    .map(reading => ({ id: reading.id, recordedAt: reading.recorded_at, value: selectValue(reading)! }))
    .sort((left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt))
}
