import type { Appliance } from './appliances-data.ts'

export const CALCULATION_ENGINE_VERSION = 'calculator-v1' as const

export type BatteryChemistry = 'lifepo4' | 'lead_acid' | 'agm' | 'unknown'
export type BackupType = 'inverter' | 'solar' | 'generator' | 'none'
export type PriorityMode = 'maximum_runtime' | 'balanced' | 'critical_only'
export type AppliancePriority = 'critical' | 'high' | 'normal' | 'low'

export interface SetupInputs {
  backupType: BackupType
  hasBattery: boolean
  batteryChemistry: BatteryChemistry
  voltage: number // Zero means the user has not provided a system voltage.
  ampHours: number // Zero means the user has not provided total bank Ah.
  directKwh: number | null
  isCapacityUnknown: boolean
  inverterRatingWatts: number | null
  inverterRatingVA?: number | null
  inverterSurgeWatts?: number | null
  solarPanelCount?: number | null
  solarPanelWatts?: number | null
  typicalOutageHours: number
  selectedAppliances: {
    applianceId: string
    quantity: number
    customName?: string
    customWatts?: number
    watts?: number
    surgeWatts?: number
    operatingHours?: number
    mustRun?: boolean
    priority?: AppliancePriority
  }[]
  priorityMode: PriorityMode
  notes?: string
}

export interface CalculationResults {
  isCalculable: boolean
  missingDetailsReason?: string
  nominalCapacityWh: number | null
  depthOfDischargeRatio: number | null
  inverterEfficiencyRatio: number
  usableCapacityWh: number | null
  totalConnectedLoadWatts: number
  continuousLoadWatts: number
  smartCycledLoadWatts: number
  estimatedEnergyWh: number
  plannedEnergyWh: number
  recommendedBatteryCapacityWh: number | null
  recommendedInverterWatts: number | null
  averageLoadWatts: number
  peakSurgeWatts: number | null
  continuousRuntimeHours: number | null
  smartRuntimeHours: number | null
  targetOutageHours: number
  isSufficient: boolean | null
  runtimeSurplusDeficitHours: number | null
  batteryPercentageAtOutageEnd: number | null
  inverterLoadPercentage: number | null
  surgeWarning: boolean | null
  applianceTiers: {
    tier1AlwaysOn: { name: string; watts: number; reason: string }[]
    tier2Cycled: { name: string; watts: number; runSchedule: string; savedWh: number }[]
    tier3Restricted: { name: string; watts: number; warning: string }[]
  }
}

const INVERTER_EFFICIENCY = 0.85
const BATTERY_SAFETY_MARGIN = 0.2

function dischargeLimit(chemistry: BatteryChemistry): number | null {
  switch (chemistry) {
    case 'lifepo4': return 0.9
    case 'lead_acid': return 0.5
    case 'agm': return 0.65
    default: return null
  }
}

export function calculateBackupPlan(inputs: SetupInputs, appliancesCatalog: Appliance[]): CalculationResults {
  const totalConnectedLoadWatts = inputs.selectedAppliances.reduce((sum, item) => {
    const preset = appliancesCatalog.find(appliance => appliance.id === item.applianceId)
    const watts = item.watts ?? item.customWatts ?? preset?.wattage ?? 0
    return sum + Math.max(0, watts) * Math.max(0, item.quantity)
  }, 0)
  const estimatedEnergyWh = inputs.selectedAppliances.reduce((sum, item) => {
    const preset = appliancesCatalog.find(appliance => appliance.id === item.applianceId)
    const watts = item.watts ?? item.customWatts ?? preset?.wattage ?? 0
    const hours = item.operatingHours ?? inputs.typicalOutageHours
    return sum + Math.max(0, watts) * Math.max(0, item.quantity) * Math.max(0, hours)
  }, 0)

  const plannedItems = inputs.priorityMode === 'critical_only'
    ? inputs.selectedAppliances.filter(item => item.mustRun || item.priority === 'critical')
    : inputs.priorityMode === 'maximum_runtime'
      ? inputs.selectedAppliances.filter(item => item.mustRun || item.priority === 'critical' || item.priority === 'high')
      : inputs.selectedAppliances
  const plannedEnergyWh = plannedItems.reduce((sum, item) => {
    const preset = appliancesCatalog.find(appliance => appliance.id === item.applianceId)
    const watts = item.watts ?? item.customWatts ?? preset?.wattage ?? 0
    const hours = item.operatingHours ?? inputs.typicalOutageHours
    return sum + Math.max(0, watts) * Math.max(0, item.quantity) * Math.max(0, hours)
  }, 0)
  const averageLoadWatts = inputs.typicalOutageHours > 0 ? plannedEnergyWh / inputs.typicalOutageHours : 0

  let peakSurgeTotal = 0
  let surgeSpecificationsComplete = inputs.selectedAppliances.length > 0
  const tier1: CalculationResults['applianceTiers']['tier1AlwaysOn'] = []
  const tier2: CalculationResults['applianceTiers']['tier2Cycled'] = []
  const tier3: CalculationResults['applianceTiers']['tier3Restricted'] = []
  inputs.selectedAppliances.forEach(item => {
    const preset = appliancesCatalog.find(appliance => appliance.id === item.applianceId)
    const name = item.customName || preset?.name || 'Custom appliance'
    const wattsEach = item.watts ?? item.customWatts ?? preset?.wattage ?? 0
    const watts = wattsEach * item.quantity
    const surgeWatts = item.surgeWatts ?? preset?.surgeWattage
    if (surgeWatts === undefined) surgeSpecificationsComplete = false
    else peakSurgeTotal += surgeWatts * item.quantity
    const hours = item.operatingHours ?? inputs.typicalOutageHours
    const priority = item.priority ?? (item.mustRun ? 'critical' : 'normal')
    const reason = `${priority[0].toUpperCase()}${priority.slice(1)} priority · ${hours}h planned use${item.mustRun ? ' · must run' : ''}`
    if (item.mustRun || priority === 'critical' || preset?.category === 'connectivity' || preset?.category === 'critical' || preset?.category === 'lighting') {
      tier1.push({ name, watts, reason })
    } else if (preset?.canCycle) {
      tier2.push({ name, watts, runSchedule: `${hours}h planned during ${inputs.typicalOutageHours}h outage`, savedWh: Math.round(watts * Math.max(0, inputs.typicalOutageHours - hours)) })
    } else if (watts > 400 || preset?.category === 'kitchen') {
      tier3.push({ name, watts, warning: `High connected load (${watts}W); confirm inverter capacity before operating.` })
    } else {
      tier1.push({ name, watts, reason })
    }
  })
  const peakSurgeWatts = surgeSpecificationsComplete ? Math.round(peakSurgeTotal) : null

  const nominalCapacityWh = inputs.backupType !== 'none' && inputs.hasBattery && !inputs.isCapacityUnknown
    ? (inputs.directKwh !== null && inputs.directKwh > 0 ? inputs.directKwh * 1000 : inputs.voltage > 0 && inputs.ampHours > 0 ? inputs.voltage * inputs.ampHours : null)
    : null
  const depthOfDischargeRatio = inputs.backupType !== 'none' && inputs.hasBattery ? dischargeLimit(inputs.batteryChemistry) : null
  const usableCapacityWh = nominalCapacityWh !== null && depthOfDischargeRatio !== null
    ? nominalCapacityWh * depthOfDischargeRatio * INVERTER_EFFICIENCY
    : null
  const recommendedBatteryCapacityWh = inputs.hasBattery && inputs.backupType !== 'none' && plannedEnergyWh > 0 && depthOfDischargeRatio !== null
    ? plannedEnergyWh * (1 + BATTERY_SAFETY_MARGIN) / (depthOfDischargeRatio * INVERTER_EFFICIENCY)
    : null
  const recommendedInverterWatts = totalConnectedLoadWatts > 0
    ? Math.ceil(totalConnectedLoadWatts * 1.25 / 100) * 100
    : null
  const isCalculable = usableCapacityWh !== null && usableCapacityWh > 0 && averageLoadWatts > 0 && inputs.typicalOutageHours > 0
  const continuousRuntimeHours = isCalculable && totalConnectedLoadWatts > 0 ? usableCapacityWh / totalConnectedLoadWatts : null
  const smartRuntimeHours = isCalculable ? usableCapacityWh / averageLoadWatts : null
  const runtimeSurplusDeficitHours = smartRuntimeHours === null ? null : smartRuntimeHours - inputs.typicalOutageHours
  const isSufficient = runtimeSurplusDeficitHours === null ? null : runtimeSurplusDeficitHours >= 0
  const batteryPercentageAtOutageEnd = usableCapacityWh !== null && plannedEnergyWh > 0
    ? Math.round(Math.max(0, usableCapacityWh - plannedEnergyWh) / usableCapacityWh * 100)
    : null
  const inverterLoadPercentage = inputs.inverterRatingWatts !== null && inputs.inverterRatingWatts > 0
    ? Math.round(totalConnectedLoadWatts / inputs.inverterRatingWatts * 100)
    : null
  const surgeWarning = peakSurgeWatts === null || inputs.inverterSurgeWatts === undefined || inputs.inverterSurgeWatts === null
    ? null
    : peakSurgeWatts > inputs.inverterSurgeWatts

  const missing: string[] = []
  if (!inputs.hasBattery || inputs.backupType === 'none') missing.push('No battery backup is configured')
  else if (nominalCapacityWh === null) missing.push('Battery capacity is unknown; enter total kWh or bank voltage and amp-hours')
  if (inputs.hasBattery && depthOfDischargeRatio === null) missing.push('Battery chemistry is unknown, so a safe discharge limit cannot be assumed')
  if (averageLoadWatts <= 0) missing.push('Select appliances and enter their planned outage hours')
  if (inputs.inverterRatingWatts === null) missing.push('Inverter capacity is not provided')

  return {
    isCalculable,
    ...(isCalculable ? {} : { missingDetailsReason: missing.join('. ') || 'Provide the missing specifications to estimate runtime.' }),
    nominalCapacityWh: nominalCapacityWh === null ? null : Math.round(nominalCapacityWh),
    depthOfDischargeRatio,
    inverterEfficiencyRatio: INVERTER_EFFICIENCY,
    usableCapacityWh: usableCapacityWh === null ? null : Math.round(usableCapacityWh),
    totalConnectedLoadWatts: Math.round(totalConnectedLoadWatts),
    continuousLoadWatts: Math.round(totalConnectedLoadWatts),
    smartCycledLoadWatts: Math.round(averageLoadWatts),
    estimatedEnergyWh: Math.round(estimatedEnergyWh),
    plannedEnergyWh: Math.round(plannedEnergyWh),
    recommendedBatteryCapacityWh: recommendedBatteryCapacityWh === null ? null : Math.ceil(recommendedBatteryCapacityWh / 100) * 100,
    recommendedInverterWatts,
    averageLoadWatts: Math.round(averageLoadWatts),
    peakSurgeWatts,
    continuousRuntimeHours,
    smartRuntimeHours,
    targetOutageHours: inputs.typicalOutageHours,
    isSufficient,
    runtimeSurplusDeficitHours,
    batteryPercentageAtOutageEnd,
    inverterLoadPercentage,
    surgeWarning,
    applianceTiers: { tier1AlwaysOn: tier1, tier2Cycled: tier2, tier3Restricted: tier3 },
  }
}
