import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vite = await createServer({ configFile: resolve(frontendRoot, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'custom' })
after(() => vite.close())

const [{ PRESET_APPLIANCES }, { calculateBackupPlan }, { buildBackupUpgradeScenarios }, { generateBackupAdvice }, { formatHoursMinutes }] = await Promise.all([
  vite.ssrLoadModule('/src/lib/appliances-data.ts'),
  vite.ssrLoadModule('/src/lib/calculations.ts'),
  vite.ssrLoadModule('/src/lib/backup-upgrade-advisor.ts'),
  vite.ssrLoadModule('/src/lib/backup-advice.ts'),
  vite.ssrLoadModule('/src/lib/duration.ts'),
])

test('runtime keeps minute precision and displays hours plus minutes', () => {
  const inputs = {
    ...baseInputs(), batteryChemistry: 'lead_acid', voltage: 0, ampHours: 0,
    directKwh: 350 / (1000 * 0.5 * 0.85),
    selectedAppliances: [{ applianceId: 'custom-load', customName: 'Test load', watts: 60, quantity: 1, operatingHours: 4 }],
  }
  const results = calculateBackupPlan(inputs, PRESET_APPLIANCES)
  assert.equal(results.isCalculable, true)
  assert.equal(Math.round(results.smartRuntimeHours * 60), 350)
  assert.equal(formatHoursMinutes(results.smartRuntimeHours), '5 hr 50 min')
  assert.equal(formatHoursMinutes(5.9), '5 hr 54 min')
  assert.equal(formatHoursMinutes(5 + 59.6 / 60), '6 hr 0 min')
  assert.equal(formatHoursMinutes(null), 'Not available')
  assert.match(generateBackupAdvice(inputs, results).verdictDescription, /5 hr 50 min/)
})

function baseInputs({ ampHours = 20, inverterRatingWatts = 1000, surgeWatts = 1500, quantity = 1 } = {}) {
  return {
    backupType: 'inverter', hasBattery: true, batteryChemistry: 'lifepo4', voltage: 24, ampHours,
    directKwh: null, isCapacityUnknown: false, inverterRatingWatts, inverterRatingVA: null,
    inverterSurgeWatts: surgeWatts, typicalOutageHours: 4, priorityMode: 'balanced', notes: '',
    selectedAppliances: [
      { applianceId: 'led-lights', quantity: 4 },
      { applianceId: 'ceiling-fan', quantity },
      { applianceId: 'inverter-fridge', quantity: 1 },
    ],
  }
}

test('current configuration that covers the outage is not offered as an upgrade', () => {
  const inputs = baseInputs({ ampHours: 200 })
  const comparison = buildBackupUpgradeScenarios(inputs, PRESET_APPLIANCES)
  assert.equal(comparison.scenarios[0].meetsTarget, true)
  assert.equal(comparison.scenarios.some(item => item.id.startsWith('capacity-')), false)
})

test('short runtime offers only capacity candidates that pass engine and inverter checks', () => {
  const comparison = buildBackupUpgradeScenarios(baseInputs(), PRESET_APPLIANCES)
  assert.equal(comparison.scenarios[0].results.isSufficient, false)
  assert.ok(comparison.scenarios.some(item => item.id.startsWith('capacity-') && item.meetsTarget))
  assert.ok(comparison.scenarios.filter(item => item.id.startsWith('capacity-')).every(item => item.results.isCalculable && item.results.isSufficient === true && item.inverterOverloaded === false && (item.results.surgeWarning === false || item.surgeUnverified)))
})

test('unknown battery specifications do not produce guessed capacity candidates', () => {
  const inputs = { ...baseInputs(), isCapacityUnknown: true }
  const comparison = buildBackupUpgradeScenarios(inputs, PRESET_APPLIANCES)
  assert.equal(comparison.scenarios.some(item => item.id.startsWith('capacity-')), false)
  assert.match(comparison.unavailableReason, /voltage\/capacity and chemistry/i)
})

test('continuous and surge overloads are detected and larger batteries are not offered as a fix', () => {
  const inputs = {
    ...baseInputs({ ampHours: 400, inverterRatingWatts: 1500, surgeWatts: 1700 }),
    selectedAppliances: [{ applianceId: 'microwave', quantity: 2 }],
  }
  const comparison = buildBackupUpgradeScenarios(inputs, PRESET_APPLIANCES)
  assert.equal(comparison.scenarios[0].inverterOverloaded, true)
  assert.equal(comparison.scenarios[0].results.surgeWarning, true)
  assert.equal(comparison.scenarios.some(item => item.id.startsWith('capacity-')), false)
  assert.match(comparison.unavailableReason, /continuous inverter overload/i)
})

test('quantity edits change the load when scenarios are recalculated', () => {
  const one = baseInputs({ ampHours: 200, quantity: 1 })
  const three = baseInputs({ ampHours: 200, quantity: 3 })
  const oneResults = calculateBackupPlan(one, PRESET_APPLIANCES)
  const threeResults = calculateBackupPlan(three, PRESET_APPLIANCES)
  assert.ok(threeResults.continuousLoadWatts > oneResults.continuousLoadWatts)
  assert.ok(threeResults.smartRuntimeHours < oneResults.smartRuntimeHours)
})

test('wattage and appliance operating hours both change the energy estimate', () => {
  const base = { ...baseInputs({ ampHours: 200 }), selectedAppliances: [{ applianceId: 'custom-monitor', customName: 'Monitor', watts: 100, quantity: 1, operatingHours: 2, priority: 'critical', mustRun: true }] }
  const baseline = calculateBackupPlan(base, PRESET_APPLIANCES)
  const moreHours = calculateBackupPlan({ ...base, selectedAppliances: [{ ...base.selectedAppliances[0], operatingHours: 4 }] }, PRESET_APPLIANCES)
  const moreWatts = calculateBackupPlan({ ...base, selectedAppliances: [{ ...base.selectedAppliances[0], watts: 200 }] }, PRESET_APPLIANCES)
  assert.equal(baseline.totalConnectedLoadWatts, 100)
  assert.equal(baseline.estimatedEnergyWh, 200)
  assert.equal(moreHours.estimatedEnergyWh, 400)
  assert.equal(moreWatts.estimatedEnergyWh, 400)
})

test('unknown battery specifications still show appliance load and energy without inventing runtime', () => {
  const unknown = { ...baseInputs(), isCapacityUnknown: true, selectedAppliances: [{ applianceId: 'ceiling-fan', quantity: 2, watts: 65, operatingHours: 3 }] }
  const results = calculateBackupPlan(unknown, PRESET_APPLIANCES)
  assert.equal(results.totalConnectedLoadWatts, 130)
  assert.equal(results.estimatedEnergyWh, 390)
  assert.equal(results.usableCapacityWh, null)
  assert.equal(results.smartRuntimeHours, null)
  assert.equal(results.isSufficient, null)
})

test('rule-based outage recommendations are generated from calculated inputs without a service call', () => {
  const inputs = baseInputs({ ampHours: 200 })
  const results = calculateBackupPlan(inputs, PRESET_APPLIANCES)
  const advice = generateBackupAdvice(inputs, results)
  assert.match(advice.verdictTitle, /Estimated runtime covers/)
  assert.ok(advice.tacticalRecommendations.length > 0)
  assert.ok(advice.timelineSchedule.some(item => item.action.includes('plan for up to') && item.appliancesStatus.includes('unit')))
  assert.ok(advice.assumptionsNotes.some(note => note.includes('85%')))
})

test('selected upgrade inputs survive a saved-plan-shaped JSON round trip and recalculate', () => {
  const comparison = buildBackupUpgradeScenarios(baseInputs(), PRESET_APPLIANCES)
  const selected = comparison.scenarios.find(item => item.id.startsWith('capacity-') && item.meetsTarget)
  assert.ok(selected)
  const savedRecord = {
    plan_name: 'Test home system',
    backup_configuration: selected.inputs,
    selected_appliances: selected.inputs.selectedAppliances,
    calculation_results: { calculation: selected.results, advice: { verdictTitle: 'Test', verdictDescription: 'Test advice', tacticalRecommendations: [], timelineSchedule: [], assumptionsNotes: [] } },
  }
  const reopened = JSON.parse(JSON.stringify(savedRecord))
  const recalculated = calculateBackupPlan(reopened.backup_configuration, PRESET_APPLIANCES)
  assert.equal(recalculated.smartRuntimeHours, selected.results.smartRuntimeHours)
  assert.equal(reopened.plan_name, 'Test home system')
  assert.deepEqual(reopened.selected_appliances, JSON.parse(JSON.stringify(selected.inputs.selectedAppliances)))
})
