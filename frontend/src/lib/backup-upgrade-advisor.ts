import type { Appliance } from '@/lib/appliances-data'
import { calculateBackupPlan, type CalculationResults, type SetupInputs } from '@/lib/calculations'

export interface BackupUpgradeScenario {
  id: string
  title: string
  description: string
  inputs: SetupInputs
  results: CalculationResults
  meetsTarget: boolean
  inverterOverloaded: boolean | null
  surgeUnverified: boolean
  notes: string[]
}

function checkInverterOverload(inputs: SetupInputs, results: CalculationResults): boolean | null {
  if (inputs.inverterRatingWatts === null) return null
  return results.continuousLoadWatts > inputs.inverterRatingWatts
}

function scenario(id: string, title: string, description: string, inputs: SetupInputs, catalog: Appliance[], notes: string[] = []): BackupUpgradeScenario {
  const results = calculateBackupPlan(inputs, catalog)
  const inverterOverloaded = checkInverterOverload(inputs, results)
  return {
    id, title, description, inputs, results,
    // This marks energy/runtime and continuous-load fit only. Surge compatibility
    // remains an explicit separate check when any surge specification is missing.
    meetsTarget: results.isCalculable && results.isSufficient === true && inverterOverloaded === false,
    inverterOverloaded,
    surgeUnverified: inputs.inverterRatingWatts === null || results.surgeWarning === null,
    notes,
  }
}

/**
 * Creates comparison candidates by changing only SetupInputs and rerunning the
 * existing PowerUp calculator. This module contains no runtime/load formulas.
 */
export function buildBackupUpgradeScenarios(
  currentInputs: SetupInputs,
  catalog: Appliance[],
): { scenarios: BackupUpgradeScenario[]; unavailableReason: string | null } {
  const current = scenario('current', 'Current setup', 'Your stated battery bank and appliance list.', currentInputs, catalog)
  const scenarios = [current]

  if (current.meetsTarget) return { scenarios, unavailableReason: null }

  if (!currentInputs.hasBattery || currentInputs.isCapacityUnknown || !current.results.isCalculable) {
    return { scenarios, unavailableReason: 'Battery voltage/capacity and chemistry are needed before PowerUp can compare larger battery-bank scenarios.' }
  }
  if (currentInputs.batteryChemistry === 'unknown') {
    return { scenarios, unavailableReason: 'Battery chemistry is unknown. Confirm the chemistry before comparing a larger bank, so the usable-capacity assumption is not presented as a compatible upgrade.' }
  }
  if (currentInputs.directKwh === null && (!currentInputs.voltage || !currentInputs.ampHours)) {
    return { scenarios, unavailableReason: 'A total battery-bank capacity is needed before PowerUp can compare upgrades.' }
  }

  const factors = [1.5, 2, 3, 4]
  factors.forEach(factor => {
    const expandedCapacity = currentInputs.directKwh !== null ? currentInputs.directKwh * factor : currentInputs.ampHours * factor
    if (expandedCapacity > (currentInputs.directKwh !== null ? 1000 : 10000)) return
    const inputs: SetupInputs = {
      ...currentInputs,
      ...(currentInputs.directKwh !== null
        ? { directKwh: Number((currentInputs.directKwh * factor).toFixed(2)) }
        : { ampHours: Math.round(currentInputs.ampHours * factor) }),
      notes: [currentInputs.notes, `Illustrative total bank capacity scaled to ${factor}× current.`].filter(Boolean).join(' '),
    }
    const labels: Record<number, string> = { 1.5: '50% more bank capacity', 2: '2× bank capacity', 3: '3× bank capacity', 4: '4× bank capacity' }
    const multiplier = factor === 1.5 ? '1.5×' : `${factor}×`
    const notes = [
      'Same stated battery chemistry and nominal system voltage assumed.',
      'Conceptual total bank capacity only; series/parallel arrangement, charger support, wiring, protection, and manufacturer limits are not verified.',
    ]
    if (currentInputs.inverterRatingWatts === null) notes.push('Inverter continuous watt rating is unknown, so this cannot be confirmed as a complete compatible upgrade.')
    else if (currentInputs.inverterSurgeWatts === null) notes.push('No inverter surge rating was provided; the calculator uses its 110% of continuous-rating estimate for this check.')
    const candidate = scenario(`capacity-${factor}`, labels[factor], `Illustrative total battery-bank capacity: ${multiplier} the current bank.`, inputs, catalog, notes)
    if (candidate.results.isCalculable && candidate.meetsTarget) scenarios.push(candidate)
  })

  const hasUpgrade = scenarios.some(item => item.id.startsWith('capacity-'))
  const unavailableReason = hasUpgrade
    ? null
    : current.inverterOverloaded
      ? 'A larger battery cannot resolve the continuous inverter overload. Reduce the load or provide a larger inverter rating and verified surge capacity first.'
      : current.results.surgeWarning
        ? 'The current surge check fails. A battery-capacity increase does not resolve inverter starting-load limits; confirm inverter surge specifications or reduce starting loads.'
        : 'No tested capacity scenario met the target within the comparison range. Confirm the battery and inverter specifications, or revise the appliance priorities and target outage.'
  return { scenarios, unavailableReason }
}
