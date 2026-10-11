import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const vite = await createServer({ configFile: 'vite.config.ts', server: { middlewareMode: true }, appType: 'custom' })
after(() => vite.close())

const [{ PRESET_APPLIANCES }, { createEmptyBackupChatState, nextRequiredQuestion, sanitizeBackupChatResponse, toSetupInputs }, { calculateBackupPlan }, { buildBackupUpgradeScenarios }] = await Promise.all([
  vite.ssrLoadModule('/src/lib/appliances-data.ts'),
  vite.ssrLoadModule('/src/lib/backup-chat.ts'),
  vite.ssrLoadModule('/src/lib/calculations.ts'),
  vite.ssrLoadModule('/src/lib/backup-upgrade-advisor.ts'),
])

function baseState({ ampHours = 20, inverterRatingWatts = 1000, surgeWatts = 1500, quantity = 1 } = {}) {
  return {
    ...createEmptyBackupChatState(),
    backupType: 'inverter', outageHours: 4, batteryChemistry: 'lifepo4', voltage: 24, ampHours,
    inverterRatingWatts, surgeWatts,
    appliances: [
      { name: 'LED lights', catalogId: 'led-lights', quantity: 4, wattage: null, category: 'lighting', desiredHours: null, priority: 'essential', excluded: false },
      { name: 'fan', catalogId: 'ceiling-fan', quantity, wattage: null, category: 'cooling', desiredHours: null, priority: 'normal', excluded: false },
      { name: 'refrigerator', catalogId: 'inverter-fridge', quantity: 1, wattage: null, category: 'cooling', desiredHours: null, priority: 'normal', excluded: false },
    ],
  }
}

test('current configuration that covers the outage is not offered as an upgrade', () => {
  const state = baseState({ ampHours: 200 })
  const inputs = toSetupInputs(state, PRESET_APPLIANCES)
  const comparison = buildBackupUpgradeScenarios(state, inputs, PRESET_APPLIANCES)
  assert.equal(comparison.scenarios[0].meetsTarget, true)
  assert.equal(comparison.scenarios.some(item => item.id.startsWith('capacity-')), false)
})

test('short runtime offers only capacity candidates that pass engine and inverter checks', () => {
  const state = baseState({ ampHours: 20 })
  const inputs = toSetupInputs(state, PRESET_APPLIANCES)
  const comparison = buildBackupUpgradeScenarios(state, inputs, PRESET_APPLIANCES)
  assert.equal(comparison.scenarios[0].results.isSufficient, false)
  assert.ok(comparison.scenarios.some(item => item.id.startsWith('capacity-') && item.meetsTarget))
  assert.ok(comparison.scenarios.filter(item => item.id.startsWith('capacity-')).every(item => item.results.isCalculable && item.results.isSufficient && item.inverterOverloaded === false && item.results.surgeWarning === false))
})

test('unknown battery specifications do not produce guessed capacity candidates', () => {
  const state = { ...baseState(), batterySpecsUnknown: true }
  const inputs = toSetupInputs(state, PRESET_APPLIANCES)
  const comparison = buildBackupUpgradeScenarios(state, inputs, PRESET_APPLIANCES)
  assert.equal(comparison.scenarios.some(item => item.id.startsWith('capacity-')), false)
  assert.match(comparison.unavailableReason, /voltage\/capacity and chemistry/i)
})

test('unknown appliance wattage triggers a question rather than a guessed preset', () => {
  const state = { ...baseState(), appliances: [{ name: 'unknown appliance', catalogId: null, quantity: 1, wattage: null, category: null, desiredHours: null, priority: null, excluded: false }] }
  assert.equal(nextRequiredQuestion(state).field, 'applianceWattage')
  assert.equal(toSetupInputs(state, PRESET_APPLIANCES).selectedAppliances.length, 0)
})

test('continuous and surge overloads are detected and larger batteries are not offered as a fix', () => {
  const state = {
    ...baseState({ ampHours: 400, inverterRatingWatts: 1500, surgeWatts: 1700 }),
    appliances: [{ name: 'microwave', catalogId: 'microwave', quantity: 2, wattage: null, category: 'kitchen', desiredHours: null, priority: 'normal', excluded: false }],
  }
  const inputs = toSetupInputs(state, PRESET_APPLIANCES)
  const comparison = buildBackupUpgradeScenarios(state, inputs, PRESET_APPLIANCES)
  assert.equal(comparison.scenarios[0].inverterOverloaded, true)
  assert.equal(comparison.scenarios[0].results.surgeWarning, true)
  assert.equal(comparison.scenarios.some(item => item.id.startsWith('capacity-')), false)
  assert.match(comparison.unavailableReason, /continuous inverter overload/i)
})

test('quantity edits change the load when scenarios are recalculated', () => {
  const one = baseState({ ampHours: 200, quantity: 1 })
  const three = baseState({ ampHours: 200, quantity: 3 })
  const oneResults = calculateBackupPlan(toSetupInputs(one, PRESET_APPLIANCES), PRESET_APPLIANCES)
  const threeResults = calculateBackupPlan(toSetupInputs(three, PRESET_APPLIANCES), PRESET_APPLIANCES)
  assert.ok(threeResults.continuousLoadWatts > oneResults.continuousLoadWatts)
  assert.ok(threeResults.smartRuntimeHours < oneResults.smartRuntimeHours)
})

test('invalid extracted values are discarded before they reach the calculation inputs', () => {
  const response = sanitizeBackupChatResponse({
    assistantMessage: 'I need a few corrected details.', questionField: 'none',
    state: { ...baseState(), voltage: 0, ampHours: -4, outageHours: 999, inverterRatingWatts: -1,
      appliances: [{ name: 'fan', catalogId: 'ceiling-fan', quantity: 0, priority: 'normal' }] },
  }, PRESET_APPLIANCES, [{ role: 'user', content: 'Plan for a fan.' }])
  assert.ok(response)
  assert.equal(response.state.voltage, null)
  assert.equal(response.state.ampHours, null)
  assert.equal(response.state.outageHours, null)
  assert.equal(response.state.inverterRatingWatts, null)
  assert.equal(response.state.appliances.length, 0)
})

test('contradictory battery capacity figures pause runtime estimation and ask for clarification', () => {
  const source = { ...baseState({ ampHours: 150 }), capacityKwh: 8 }
  const response = sanitizeBackupChatResponse({ assistantMessage: 'Please confirm the battery label.', questionField: 'batterySpecs', state: source }, PRESET_APPLIANCES, [{ role: 'user', content: '24V 150Ah battery, total bank is 8kWh.' }])
  assert.ok(response)
  assert.equal(response.state.batterySpecsConflict, true)
  assert.match(nextRequiredQuestion(response.state).question, /do not agree/i)
  assert.equal(toSetupInputs(response.state, PRESET_APPLIANCES).isCapacityUnknown, true)
})

test('selected upgrade inputs survive a saved-plan-shaped JSON round trip and recalculate', () => {
  const state = baseState({ ampHours: 20 })
  const initial = buildBackupUpgradeScenarios(state, toSetupInputs(state, PRESET_APPLIANCES), PRESET_APPLIANCES)
  const selected = initial.scenarios.find(item => item.id.startsWith('capacity-') && item.meetsTarget)
  assert.ok(selected)
  const savedRecord = {
    backup_configuration: selected.inputs,
    selected_appliances: selected.inputs.selectedAppliances,
    calculation_results: { calculation: selected.results, advice: { verdictTitle: 'Test', verdictDescription: 'Test advice', tacticalRecommendations: [], timelineSchedule: [], assumptionsNotes: [] } },
  }
  const reopened = JSON.parse(JSON.stringify(savedRecord))
  const recalculated = calculateBackupPlan(reopened.backup_configuration, PRESET_APPLIANCES)
  assert.equal(recalculated.smartRuntimeHours, selected.results.smartRuntimeHours)
  assert.deepEqual(reopened.selected_appliances, JSON.parse(JSON.stringify(selected.inputs.selectedAppliances)))
})
