import type { SetupInputs, CalculationResults } from './calculations'
import { formatHoursMinutes } from './duration'

export interface BackupAdvice {
  verdictTitle: string
  verdictDescription: string
  tacticalRecommendations: { title: string; impact: string; action: string; badge: 'high-impact' | 'energy-saver' | 'safety' }[]
  timelineSchedule: { timeSlot: string; action: string; appliancesStatus: string }[]
  assumptionsNotes: string[]
}

export function generateBackupAdvice(inputs: SetupInputs, results: CalculationResults): BackupAdvice {
  const mode = inputs.priorityMode === 'critical_only' ? 'Critical appliances only' : inputs.priorityMode === 'maximum_runtime' ? 'Maximum runtime' : 'All selected appliances'
  const recommendations: BackupAdvice['tacticalRecommendations'] = []
  if (results.inverterLoadPercentage !== null && results.inverterLoadPercentage > 100) recommendations.push({
    title: 'Connected load exceeds inverter rating', impact: 'Reduce load or verify inverter size',
    action: `The entered appliances total ${results.totalConnectedLoadWatts} W against an inverter rating of ${inputs.inverterRatingWatts} W. Do not assume all appliances can run at once.`, badge: 'safety',
  })
  if (inputs.inverterSurgeWatts == null) recommendations.push({
    title: 'Surge rating not provided', impact: 'Starting-load check unavailable',
    action: 'Check the inverter label or manual for its surge rating, especially if the system supplies motors, pumps, refrigerators, or compressors.', badge: 'safety',
  })
  if (!inputs.hasBattery || inputs.backupType === 'none') recommendations.push({
    title: 'Battery backup not configured', impact: 'Runtime cannot be estimated',
    action: 'Add the battery details when available. The appliance load and energy estimate remain available without them.', badge: 'safety',
  })
  if (results.recommendedBatteryCapacityWh !== null) recommendations.push({
    title: 'Estimated battery sizing target', impact: 'Planning estimate only',
    action: `The entered demand implies approximately ${(results.recommendedBatteryCapacityWh / 1000).toFixed(2)} kWh nominal capacity, including a 20% planning margin. Confirm with equipment manufacturers and an installer.`, badge: 'high-impact',
  })
  if (!recommendations.length) recommendations.push({
    title: 'Review the entered operating schedule', impact: 'Improve estimate quality',
    action: 'Compare each appliance wattage with its label and adjust the planned outage hours to match how you expect to use it.', badge: 'energy-saver',
  })

  const planned = inputs.selectedAppliances
    .filter(item => inputs.priorityMode === 'critical_only'
      ? item.mustRun || item.priority === 'critical'
      : inputs.priorityMode === 'maximum_runtime'
        ? item.mustRun || item.priority === 'critical' || item.priority === 'high'
        : true)
    .slice().sort((left, right) => (left.priority ?? 'normal').localeCompare(right.priority ?? 'normal'))
  const timeline: BackupAdvice['timelineSchedule'] = planned.map(item => {
    const name = item.customName || item.applianceId
    const hours = item.operatingHours ?? inputs.typicalOutageHours
    return {
      timeSlot: `${hours}h planned · ${item.priority ?? 'normal'} priority${item.mustRun ? ' · must run' : ''}`,
      action: `${name}: plan for up to ${hours} hours during the outage.`,
      appliancesStatus: `${item.quantity} unit${item.quantity === 1 ? '' : 's'} · ${item.watts ?? item.customWatts ?? 'preset'} W each`,
    }
  })
  if (!timeline.length) timeline.push({ timeSlot: 'No appliances in this strategy', action: 'Add critical appliances or choose a broader priority mode to estimate their demand.', appliancesStatus: 'No planned load' })

  const assumptions = [
    'Battery usable energy uses a fixed 85% inverter conversion efficiency estimate.',
    'Typical safe depth-of-discharge assumptions are 90% LiFePO₄, 50% lead-acid, and 65% AGM; actual battery limits vary by model and age.',
    'Recommended nominal battery sizing includes a 20% planning margin over the entered energy demand.',
    'The suggested inverter continuous rating is the connected load plus a 25% planning margin; starting surge requirements still need a verified inverter surge specification.',
    'Appliance demand assumes each entered wattage applies for the entered operating hours; startup loads, temperature, battery age, wiring loss, and inverter behavior can change results.',
    'All runtime and sizing values are estimates, not guarantees. Confirm specifications with the equipment manufacturer or a qualified installer.',
  ]
  if (inputs.batteryChemistry === 'unknown') assumptions.push('Battery chemistry is unknown, so the calculator does not assume a discharge limit or estimate runtime.')
  if (inputs.backupType === 'solar' && (!inputs.solarPanelCount || !inputs.solarPanelWatts)) assumptions.push('Solar panel count or wattage is missing. Panel nameplate details do not predict generation without site, weather, and system data.')

  const title = results.isCalculable
    ? results.isSufficient ? 'Estimated runtime covers the entered outage' : 'Estimated runtime is shorter than the entered outage'
    : 'Load and energy estimate available · runtime needs more details'
  const description = results.isCalculable
    ? `For ${mode.toLowerCase()}, estimated energy use is ${results.plannedEnergyWh} Wh over ${inputs.typicalOutageHours} hours. Estimated runtime is ${formatHoursMinutes(results.smartRuntimeHours)}. This is a planning estimate, not a guarantee.`
    : `${results.totalConnectedLoadWatts} W total connected load and ${results.estimatedEnergyWh} Wh estimated energy use from the entered appliances. Runtime is not shown: ${results.missingDetailsReason ?? 'required specifications are missing'}.`

  return {
    verdictTitle: title,
    verdictDescription: description,
    tacticalRecommendations: recommendations,
    timelineSchedule: timeline,
    assumptionsNotes: assumptions,
  }
}
