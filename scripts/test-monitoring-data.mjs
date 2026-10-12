import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const vite = await createServer({ configFile: 'vite.config.ts', server: { middlewareMode: true }, appType: 'custom' })
after(() => vite.close())
const { getNominalCapacityWh, getTrendPoints, validateManualReading } = await vite.ssrLoadModule('/src/lib/monitoring-data.ts')

function inputs(overrides = {}) {
  return { backupType: 'inverter', hasBattery: true, batteryChemistry: 'lifepo4', voltage: 48, ampHours: 100, directKwh: null, isCapacityUnknown: false, inverterRatingWatts: 3000, typicalOutageHours: 4, selectedAppliances: [], priorityMode: 'balanced', ...overrides }
}

test('nominal system capacity uses the same saved battery fields as the calculator', () => {
  assert.equal(getNominalCapacityWh(inputs()), 4800)
  assert.equal(getNominalCapacityWh(inputs({ directKwh: 5.2 })), 5200)
  assert.equal(getNominalCapacityWh(inputs({ isCapacityUnknown: true, voltage: 0, ampHours: 0 })), null)
  assert.equal(getNominalCapacityWh(inputs({ isCapacityUnknown: true })), null, 'unknown mode must override stale saved capacity fields')
  assert.equal(getNominalCapacityWh(inputs({ backupType: 'none', hasBattery: false })), null)
})

test('manual readings require supported, bounded, user-observed values', () => {
  const timestamp = new Date('2026-10-12T10:00:00Z')
  assert.equal(validateManualReading(inputs(), { battery_percentage: 80, battery_voltage: null, load_watts: 0, solar_generation_watts: null }, timestamp, timestamp.getTime()), null)
  assert.match(validateManualReading(inputs(), { battery_percentage: 101, battery_voltage: null, load_watts: null, solar_generation_watts: null }, timestamp, timestamp.getTime()) || '', /between 0 and 100/)
  assert.match(validateManualReading(inputs(), { battery_percentage: null, battery_voltage: null, load_watts: null, solar_generation_watts: null }, timestamp, timestamp.getTime()) || '', /at least one/)
  assert.match(validateManualReading(inputs(), { battery_percentage: null, battery_voltage: null, load_watts: null, solar_generation_watts: 500 }, timestamp, timestamp.getTime()) || '', /only be recorded for a solar system/)
  assert.match(validateManualReading(inputs({ hasBattery: false, backupType: 'none' }), { battery_percentage: 20, battery_voltage: null, load_watts: null, solar_generation_watts: null }, timestamp, timestamp.getTime()) || '', /unavailable/)
})

test('future measurements are rejected and trends contain only stored values in time order', () => {
  const now = Date.parse('2026-10-12T10:00:00Z')
  assert.match(validateManualReading(inputs(), { battery_percentage: null, battery_voltage: null, load_watts: 20, solar_generation_watts: null }, new Date(now + 10 * 60 * 1000), now) || '', /future/)
  const points = getTrendPoints([
    { id: 'new', recorded_at: '2026-10-12T09:00:00Z', value: 40 },
    { id: 'missing', recorded_at: '2026-10-12T08:00:00Z', value: null },
    { id: 'old', recorded_at: '2026-10-12T07:00:00Z', value: 75 },
  ], reading => reading.value)
  assert.deepEqual(points.map(point => [point.id, point.value]), [['old', 75], ['new', 40]])
})
