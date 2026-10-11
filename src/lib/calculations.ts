import { Appliance } from './appliances-data'

export type BatteryChemistry = 'lifepo4' | 'lead_acid' | 'agm' | 'unknown'
export type BackupType = 'inverter' | 'solar' | 'generator' | 'none'
export type PriorityMode = 'maximum_runtime' | 'balanced' | 'critical_only'

export interface SetupInputs {
  backupType: BackupType
  hasBattery: boolean
  batteryChemistry: BatteryChemistry
  voltage: number // e.g. 12, 24, 48
  ampHours: number // e.g. 100, 200
  directKwh: number | null // e.g. 2.4, 5.0
  isCapacityUnknown: boolean
  inverterRatingWatts: number | null // null when the continuous W rating is not known
  inverterRatingVA?: number | null
  inverterSurgeWatts?: number | null
  typicalOutageHours: number // e.g. 4
  selectedAppliances: {
    applianceId: string
    quantity: number
    customName?: string
    customWatts?: number
  }[]
  priorityMode: PriorityMode
  notes?: string
}

export interface CalculationResults {
  isCalculable: boolean
  missingDetailsReason?: string
  nominalCapacityWh: number
  depthOfDischargeRatio: number
  inverterEfficiencyRatio: number
  usableCapacityWh: number
  continuousLoadWatts: number
  smartCycledLoadWatts: number
  peakSurgeWatts: number
  continuousRuntimeHours: number
  smartRuntimeHours: number
  targetOutageHours: number
  isSufficient: boolean
  runtimeSurplusDeficitHours: number
  batteryPercentageAtOutageEnd: number
  inverterLoadPercentage: number | null
  surgeWarning: boolean | null
  applianceTiers: {
    tier1AlwaysOn: { name: string; watts: number; reason: string }[]
    tier2Cycled: { name: string; watts: number; runSchedule: string; savedWh: number }[]
    tier3Restricted: { name: string; watts: number; warning: string }[]
  }
}

export function calculateBackupPlan(
  inputs: SetupInputs,
  appliancesCatalog: Appliance[]
): CalculationResults {
  // Check if technical specifications permit deterministic calculation
  if (inputs.backupType === 'none') {
    return {
      isCalculable: false,
      missingDetailsReason: "No backup system installed. Guidance focused on battery packs, power bank triage, and outage safety.",
      nominalCapacityWh: 0,
      depthOfDischargeRatio: 0,
      inverterEfficiencyRatio: 0,
      usableCapacityWh: 0,
      continuousLoadWatts: 0,
      smartCycledLoadWatts: 0,
      peakSurgeWatts: 0,
      continuousRuntimeHours: 0,
      smartRuntimeHours: 0,
      targetOutageHours: inputs.typicalOutageHours,
      isSufficient: false,
      runtimeSurplusDeficitHours: -inputs.typicalOutageHours,
      batteryPercentageAtOutageEnd: 0,
      inverterLoadPercentage: 0,
      surgeWarning: inputs.inverterRatingWatts === null && !inputs.inverterSurgeWatts ? null : false,
      applianceTiers: {
        tier1AlwaysOn: [],
        tier2Cycled: [],
        tier3Restricted: []
      }
    }
  }

  if (inputs.isCapacityUnknown || (!inputs.directKwh && (!inputs.voltage || !inputs.ampHours))) {
    return {
      isCalculable: false,
      missingDetailsReason: "Battery specifications are unknown. Recommendations provide relative load prioritization until battery Ah/V is verified.",
      nominalCapacityWh: 0,
      depthOfDischargeRatio: 0.6,
      inverterEfficiencyRatio: 0.85,
      usableCapacityWh: 0,
      continuousLoadWatts: 0,
      smartCycledLoadWatts: 0,
      peakSurgeWatts: 0,
      continuousRuntimeHours: 0,
      smartRuntimeHours: 0,
      targetOutageHours: inputs.typicalOutageHours,
      isSufficient: false,
      runtimeSurplusDeficitHours: 0,
      batteryPercentageAtOutageEnd: 0,
      inverterLoadPercentage: 0,
      surgeWarning: inputs.inverterRatingWatts === null && !inputs.inverterSurgeWatts ? null : false,
      applianceTiers: {
        tier1AlwaysOn: [],
        tier2Cycled: [],
        tier3Restricted: []
      }
    }
  }

  // 1. Calculate Nominal Wh
  let nominalWh = 0
  if (inputs.directKwh && inputs.directKwh > 0) {
    nominalWh = inputs.directKwh * 1000
  } else {
    nominalWh = inputs.voltage * inputs.ampHours
  }

  // 2. Depth of Discharge by chemistry
  let dod = 0.60
  switch (inputs.batteryChemistry) {
    case 'lifepo4':
      dod = 0.90 // Safe 90% DoD for Lithium Iron Phosphate
      break
    case 'lead_acid':
      dod = 0.50 // Max 50% DoD to prevent tubular lead plate sulfation
      break
    case 'agm':
      dod = 0.65 // Absorbed Glass Mat
      break
    default:
      dod = 0.60
  }

  const inverterEfficiency = 0.85 // Realistic 85% DC to AC inverter conversion
  const usableWh = nominalWh * dod * inverterEfficiency

  // 3. Compute Loads & Surges
  let continuousWatts = 0
  let smartCycledWatts = 0
  let peakSurgeWatts = 0

  const tier1: { name: string; watts: number; reason: string }[] = []
  const tier2: { name: string; watts: number; runSchedule: string; savedWh: number }[] = []
  const tier3: { name: string; watts: number; warning: string }[] = []

  inputs.selectedAppliances.forEach(item => {
    const preset = appliancesCatalog.find(a => a.id === item.applianceId)
    const name = item.customName || preset?.name || 'Custom Device'
    const watts = (item.customWatts || preset?.wattage || 0) * item.quantity
    const surge = (preset?.surgeWattage ? preset.surgeWattage * item.quantity : watts)

    continuousWatts += watts
    peakSurgeWatts += surge

    if (preset?.category === 'connectivity' || preset?.category === 'critical' || preset?.category === 'lighting') {
      smartCycledWatts += watts
      tier1.push({
        name,
        watts,
        reason: preset.tip || 'Critical low-drain essential for communications, health, or visibility.'
      })
    } else if (preset?.canCycle) {
      // Cycled appliance (e.g. Fridge, fans)
      const ratio = inputs.priorityMode === 'maximum_runtime' ? preset.dutyCycleRatio * 0.7 : preset.dutyCycleRatio
      const effectiveWatts = watts * ratio
      smartCycledWatts += effectiveWatts
      const hourlySaved = (watts - effectiveWatts) * inputs.typicalOutageHours
      tier2.push({
        name,
        watts,
        runSchedule: `Run ~${Math.round(ratio * 60)} mins per hour (Cycle off remainder)`,
        savedWh: Math.round(hourlySaved)
      })
    } else if (watts > 400 || preset?.category === 'kitchen') {
      // High power draw
      tier3.push({
        name,
        watts,
        warning: `Extremely high battery drain (${watts}W). Running this will exhaust backup within minutes.`
      })
    } else {
      smartCycledWatts += watts
      tier1.push({
        name,
        watts,
        reason: 'Low continuous draw.'
      })
    }
  })

  // Prevent division by zero
  const safeContinuousWatts = Math.max(continuousWatts, 5)
  const safeCycledWatts = Math.max(smartCycledWatts, 5)

  const continuousHours = usableWh / safeContinuousWatts
  const smartHours = usableWh / safeCycledWatts

  const surplusDeficit = smartHours - inputs.typicalOutageHours
  const isSufficient = surplusDeficit >= 0

  // Remaining battery percentage at outage conclusion (under smart schedule)
  const consumedWh = safeCycledWatts * inputs.typicalOutageHours
  const remainingUsableWh = Math.max(0, usableWh - consumedWh)
  const batteryPctEnd = Math.round((remainingUsableWh / usableWh) * 100)

  const inverterCapacity = inputs.inverterRatingWatts
  const inverterLoadPct = inverterCapacity && inverterCapacity > 0
    ? Math.min(100, Math.round((continuousWatts / inverterCapacity) * 100))
    : null
  const surgeCapacity = inputs.inverterSurgeWatts ?? (inverterCapacity !== null ? inverterCapacity * 1.1 : null)
  const surgeWarning = surgeCapacity === null ? null : peakSurgeWatts > surgeCapacity

  return {
    isCalculable: true,
    nominalCapacityWh: Math.round(nominalWh),
    depthOfDischargeRatio: dod,
    inverterEfficiencyRatio: inverterEfficiency,
    usableCapacityWh: Math.round(usableWh),
    continuousLoadWatts: Math.round(continuousWatts),
    smartCycledLoadWatts: Math.round(smartCycledWatts),
    peakSurgeWatts: Math.round(peakSurgeWatts),
    continuousRuntimeHours: parseFloat(continuousHours.toFixed(1)),
    smartRuntimeHours: parseFloat(smartHours.toFixed(1)),
    targetOutageHours: inputs.typicalOutageHours,
    isSufficient,
    runtimeSurplusDeficitHours: parseFloat(surplusDeficit.toFixed(1)),
    batteryPercentageAtOutageEnd: batteryPctEnd,
    inverterLoadPercentage: inverterLoadPct,
    surgeWarning,
    applianceTiers: {
      tier1AlwaysOn: tier1,
      tier2Cycled: tier2,
      tier3Restricted: tier3
    }
  }
}
