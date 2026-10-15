import { AI_ADVISOR_CONTRACT_VERSION, AI_ADVISOR_LIMITS } from '../../../../frontend/src/lib/ai-advisor-contract.ts'
import type {
  AdvisorConfirmedDraft, AdvisorErrorCode, AdvisorInputProposal,
  AdvisorRequestV1, AdvisorResponseV1, AdvisorSetupInputs,
} from '../../../../frontend/src/lib/ai-advisor-contract.ts'
import { calculateBackupPlan, CALCULATION_ENGINE_VERSION } from '../../../../frontend/src/lib/calculations.ts'
import type { BatteryChemistry, CalculationResults } from '../../../../frontend/src/lib/calculations.ts'
import { PRESET_APPLIANCES } from '../../../../frontend/src/lib/appliances-data.ts'

type RecordValue = Record<string, unknown>
type Identity = { kind: 'guest'; networkAddress: string } | { kind: 'user'; id: string }

export class AdvisorFailure extends Error {
  constructor(public code: AdvisorErrorCode, public status: number, message: string, public retryable = false) {
    super(message)
  }
}

export interface AdvisorDependencies {
  authenticate: (request: Request) => Promise<Identity>
  checkProviderConfiguration?: () => void
  consumeQuota: (identity: Identity) => Promise<boolean>
  callProvider: (request: AdvisorRequestV1, results?: CalculationResults) => Promise<unknown>
}

const setupFields = new Set([
  'backupType', 'hasBattery', 'batteryChemistry', 'voltage', 'ampHours',
  'directKwh', 'isCapacityUnknown', 'inverterRatingWatts', 'inverterRatingVA',
  'inverterSurgeWatts', 'solarPanelCount', 'solarPanelWatts',
  'typicalOutageHours', 'selectedAppliances', 'priorityMode',
])
const proposalFields = new Set([...setupFields].filter(field => field !== 'selectedAppliances'))
const applianceFields = new Set([
  'applianceId', 'quantity', 'customName', 'customWatts', 'watts',
  'surgeWatts', 'operatingHours', 'mustRun', 'priority',
])
const presetById = new Map(PRESET_APPLIANCES.map(appliance => [appliance.id, appliance]))
const resultFields = new Set([
  'isCalculable', 'nominalCapacityWh', 'depthOfDischargeRatio',
  'inverterEfficiencyRatio', 'usableCapacityWh', 'totalConnectedLoadWatts',
  'continuousLoadWatts', 'smartCycledLoadWatts', 'estimatedEnergyWh',
  'plannedEnergyWh', 'recommendedBatteryCapacityWh',
  'recommendedInverterWatts', 'averageLoadWatts', 'peakSurgeWatts',
  'continuousRuntimeHours', 'smartRuntimeHours', 'targetOutageHours',
  'isSufficient', 'runtimeSurplusDeficitHours',
  'batteryPercentageAtOutageEnd', 'inverterLoadPercentage', 'surgeWarning',
])

function object(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: RecordValue, allowed: Set<string>): boolean {
  return Object.keys(value).every(key => allowed.has(key))
}

function numberInRange(value: unknown, min: number, max: number, integer = false): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))
}

function boundedString(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0)
}

function fieldValid(field: string, value: unknown): boolean {
  switch (field) {
    case 'backupType': return ['inverter', 'solar', 'generator', 'none'].includes(String(value))
    case 'batteryChemistry': return ['lifepo4', 'lead_acid', 'agm', 'unknown'].includes(String(value))
    case 'priorityMode': return ['maximum_runtime', 'balanced', 'critical_only'].includes(String(value))
    case 'hasBattery': case 'isCapacityUnknown': return typeof value === 'boolean'
    case 'voltage': return numberInRange(value, 0, 1000)
    case 'ampHours': return numberInRange(value, 0, 100000)
    case 'directKwh': return value === null || numberInRange(value, 0.001, 10000)
    case 'inverterRatingWatts': case 'inverterRatingVA': case 'inverterSurgeWatts':
      return value === null || numberInRange(value, 1, 1000000)
    case 'solarPanelCount': return value === null || numberInRange(value, 1, 10000, true)
    case 'solarPanelWatts': return value === null || numberInRange(value, 1, 100000)
    case 'typicalOutageHours': return numberInRange(value, 0.1, 168)
    default: return false
  }
}

function applianceValid(value: unknown, explain: boolean): boolean {
  if (!object(value) || !exactKeys(value, applianceFields)) return false
  const id = value.applianceId
  if (!boundedString(id, 80) || !numberInRange(value.quantity, 1, 1000, true)) return false
  const preset = presetById.get(id)
  if (!preset && (!id.startsWith('custom-') || !boundedString(value.customName, 100))) return false
  if (value.customName !== undefined && !boundedString(value.customName, 100)) return false
  for (const field of ['watts', 'customWatts', 'surgeWatts']) {
    if (value[field] !== undefined && !numberInRange(value[field], 1, 100000)) return false
  }
  if (value.operatingHours !== undefined && !numberInRange(value.operatingHours, 0, 168)) return false
  if (value.mustRun !== undefined && typeof value.mustRun !== 'boolean') return false
  if (value.priority !== undefined && !['critical', 'high', 'normal', 'low'].includes(String(value.priority))) return false
  if (explain && !preset && value.watts === undefined && value.customWatts === undefined) return false
  return true
}

function inputsValid(value: unknown, explain: boolean): value is AdvisorConfirmedDraft & AdvisorSetupInputs {
  if (!object(value) || !exactKeys(value, setupFields)) return false
  for (const [field, fieldValue] of Object.entries(value)) {
    if (field === 'selectedAppliances') {
      if (!Array.isArray(fieldValue) || fieldValue.length > AI_ADVISOR_LIMITS.maxAppliances ||
          fieldValue.some(item => !applianceValid(item, explain))) return false
      if (new Set(fieldValue.map(item => item.applianceId)).size !== fieldValue.length) return false
    } else if (!fieldValid(field, fieldValue)) return false
  }
  if (!explain) return true
  const required = [
    'backupType', 'hasBattery', 'batteryChemistry', 'voltage', 'ampHours',
    'directKwh', 'isCapacityUnknown', 'inverterRatingWatts',
    'typicalOutageHours', 'selectedAppliances', 'priorityMode',
  ]
  if (required.some(key => !(key in value))) return false
  const outageHours = value.typicalOutageHours as number
  return (value.selectedAppliances as RecordValue[]).every(item => item.operatingHours === undefined || (item.operatingHours as number) <= outageHours)
}

export function validateAdvisorRequest(value: unknown): AdvisorRequestV1 {
  if (!object(value) || value.version !== AI_ADVISOR_CONTRACT_VERSION || !['intake', 'explain'].includes(String(value.action)) ||
      !['en', 'ur'].includes(String(value.locale))) {
    throw new AdvisorFailure('invalid_request', 400, 'The advisor request version, action, or language is invalid.')
  }
  const intake = value.action === 'intake'
  if (!exactKeys(value, new Set(intake ? ['version', 'action', 'locale', 'turns', 'confirmedInputs'] : ['version', 'action', 'locale', 'confirmedInputs'])) ||
      !inputsValid(value.confirmedInputs, !intake)) {
    throw new AdvisorFailure('invalid_request', 400, 'The confirmed backup details are invalid or incomplete.')
  }
  if (intake) {
    const turns = value.turns
    if (!Array.isArray(turns) || turns.length < 1 || turns.length > AI_ADVISOR_LIMITS.maxTurns ||
        turns[turns.length - 1]?.role !== 'user' || turns.some(turn => !object(turn) || !exactKeys(turn, new Set(['role', 'content'])) ||
          !['user', 'assistant'].includes(String(turn.role)) || !boundedString(turn.content, AI_ADVISOR_LIMITS.maxTurnCharacters)) ||
        turns.reduce((sum, turn) => sum + turn.content.length, 0) > AI_ADVISOR_LIMITS.maxConversationCharacters) {
      throw new AdvisorFailure('invalid_request', 400, 'The conversation is invalid or too long.')
    }
  }
  return value as AdvisorRequestV1
}

function validateTextList(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every(item => boundedString(item, maxLength))
}

function evidenceValid(evidence: string, source: string, turns: { role: string; content: string }[], applianceId?: string): boolean {
  if (source === 'user_statement') return turns.some(turn => turn.role === 'user' && turn.content.toLocaleLowerCase().includes(evidence.toLocaleLowerCase()))
  return source === 'named_catalog_preset' && Boolean(applianceId && presetById.get(applianceId)?.name.toLocaleLowerCase() === evidence.toLocaleLowerCase())
}

const numericEvidenceUnits: Record<string, string> = {
  voltage: 'v|volts?', ampHours: 'ah|amp(?:ere)?[- ]?hours?', directKwh: 'kwh',
  inverterRatingWatts: 'w|watts?', inverterRatingVA: 'va', inverterSurgeWatts: 'w|watts?',
  solarPanelCount: 'panels?', solarPanelWatts: 'w|watts?', typicalOutageHours: 'h|hrs?|hours?',
}
const smallNumberWords = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
]

function contextualNumericFact(turns: { role: string; content: string }[]): { field: string; value: number; evidence: string } | undefined {
  const latest = turns[turns.length - 1]
  const previous = turns[turns.length - 2]
  if (latest?.role !== 'user' || previous?.role !== 'assistant') return undefined
  const evidence = latest.content.trim()
  if (!/^\d+(?:\.\d+)?$/.test(evidence)) return undefined
  const value = Number(evidence)
  const question = previous.content.toLowerCase()
  const field = /how many hours|backup duration|outage duration/.test(question) ? 'typicalOutageHours'
    : /battery.*(?:capacity|amp.hours|\bah\b)/.test(question) ? 'ampHours'
      : /(?:battery.*(?:voltage|volts?)|(?:voltage|volts?).*battery)/.test(question) ? 'voltage' : undefined
  return field && fieldValid(field, value) ? { field, value, evidence } : undefined
}

function evidenceSupportsValue(field: string, value: unknown, evidence: string, turns?: { role: string; content: string }[]): boolean {
  if (typeof value !== 'number') return true
  const contextual = turns && contextualNumericFact(turns)
  if (contextual && contextual.field === field && contextual.value === value && contextual.evidence === evidence) return true
  if (field === 'inverterRatingWatts') {
    const kilowatts = evidence.match(/\b(\d+(?:\.\d+)?)\s*kw\b/i)
    if (kilowatts && /\binverter\b/i.test(evidence) && Number(kilowatts[1]) * 1000 === value) return true
  }
  const unit = numericEvidenceUnits[field]
  if (!unit) return true
  const literal = String(value).replace('.', '\\.')
  if (new RegExp(`(?:^|[^0-9.])${literal}\\s*-?\\s*(?:${unit})(?![a-z])`, 'i').test(evidence)) return true
  const word = Number.isInteger(value) ? smallNumberWords[value] : undefined
  return Boolean(word && new RegExp(`(?:^|[^a-z])${word}\\s*-?\\s*(?:${unit})(?![a-z])`, 'i').test(evidence))
}

const spokenNumbers: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}

function lastUnitAmount(turns: { role: string; content: string }[], unit: string): number | undefined {
  let result: number | undefined
  const pattern = new RegExp(`\\b(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\\s*${unit}\\b`, 'ig')
  for (const turn of turns) {
    if (turn.role !== 'user') continue
    for (const match of turn.content.matchAll(pattern)) result = Number(match[1]) || spokenNumbers[match[1].toLowerCase()]
  }
  return result
}

function lastUnitFact(turns: { role: string; content: string }[], unit: string): { value: number; evidence: string } | undefined {
  let fact: { value: number; evidence: string } | undefined
  const pattern = new RegExp(`\\b(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\\s*${unit}\\b`, 'ig')
  for (const turn of turns) {
    if (turn.role !== 'user') continue
    for (const match of turn.content.matchAll(pattern)) {
      const value = Number(match[1]) || spokenNumbers[match[1].toLowerCase()]
      if (value !== undefined) fact = { value, evidence: match[0] }
    }
  }
  return fact
}

function statedAppliances(request: Extract<AdvisorRequestV1, { action: 'intake' }>) {
  const selected = new Map((request.confirmedInputs.selectedAppliances ?? []).map(item => [item.applianceId, item]))
  const evidence = new Map<string, string>()
  const descriptions = [
    { id: 'wifi-router', name: 'Router', term: /\b(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+)?(?:wi[ -]?fi\s+)?routers?\b/ig },
    { id: 'custom-light', name: 'Light', term: /\b(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+)?(?:led\s+)?(?:lights?|bulbs?)\b/ig },
    { id: 'custom-fan', name: 'Fan', term: /\b(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+)?fans?\b/ig },
  ]
  for (const turn of request.turns) {
    if (turn.role !== 'user') continue
    for (const description of descriptions) {
      for (const match of turn.content.matchAll(description.term)) {
        const quantity = match[1] ? Number(match[1]) || spokenNumbers[match[1].toLowerCase()] : 1
        const rest = turn.content.slice((match.index ?? 0) + match[0].length)
        const wattage = rest.match(/^\s*(?:(?:each|at|of|rated|uses?)\s*)?(\d+(?:\.\d+)?)\s*(?:w|watts?)\b/i)
        const watts = wattage ? Number(wattage[1]) : undefined
        const id = description.id === 'custom-light' && watts === undefined ? 'led-lights' : description.id
        const item = { ...selected.get(id), applianceId: id, quantity, ...(id.startsWith('custom-') ? { customName: description.name } : {}), ...(watts && watts > 0 ? { watts } : {}) }
        if (!applianceValid(item, false)) continue
        selected.set(id, item)
        evidence.set(id, match[0] + (wattage?.[0] ?? ''))
      }
    }
  }
  return { selected: [...selected.values()], evidence }
}

function statedInverterWatts(turns: { role: string; content: string }[]): { value: number; evidence: string } | undefined {
  let fact: { value: number; evidence: string } | undefined
  for (const turn of turns) {
    if (turn.role !== 'user') continue
    const patterns = [/\b(\d+(?:\.\d+)?)\s*(kw|w|watts?)\s+(?:solar\s+)?inverter\b/ig,
      /\binverter\s+(?:rated\s+)?(?:at\s+)?(\d+(?:\.\d+)?)\s*(kw|w|watts?)\b/ig]
    for (const pattern of patterns) for (const match of turn.content.matchAll(pattern)) {
      const value = Number(match[1]) * (match[2].toLowerCase() === 'kw' ? 1000 : 1)
      if (fieldValid('inverterRatingWatts', value)) fact = { value, evidence: match[0] }
    }
  }
  return fact
}

function statedFallbackFacts(request: Extract<AdvisorRequestV1, { action: 'intake' }>): AdvisorInputProposal[] {
  const proposals: AdvisorInputProposal[] = []
  const addField = (field: string, fact?: { value: unknown; evidence: string }) => {
    if (!fact || !fieldValid(field, fact.value) || request.confirmedInputs[field as keyof AdvisorConfirmedDraft] === fact.value) return
    const previous = proposals.findIndex(proposal => proposal.kind === 'set_field' && proposal.field === field)
    if (previous !== -1) proposals.splice(previous, 1)
    proposals.push({ kind: 'set_field', field, value: fact.value, source: 'user_statement', evidence: fact.evidence } as AdvisorInputProposal)
  }
  addField('ampHours', lastUnitFact(request.turns, '(?:ah|amp(?:ere)?[- ]?hours?)'))
  addField('voltage', lastUnitFact(request.turns, '(?:v|volts?)'))
  addField('directKwh', lastUnitFact(request.turns, 'kwh'))
  addField('typicalOutageHours', lastUnitFact(request.turns, '(?:h|hrs?|hours?)'))
  addField('inverterRatingWatts', statedInverterWatts(request.turns))
  const contextual = contextualNumericFact(request.turns)
  if (contextual) addField(contextual.field, contextual)
  let batteryEvidence: string | undefined
  let backupFact: { value: string; evidence: string } | undefined
  let chemistryFact: { value: string; evidence: string } | undefined
  for (const turn of request.turns) {
    if (turn.role !== 'user') continue
    batteryEvidence = turn.content.match(/\bbatter(?:y|ies)\b/i)?.[0] ?? batteryEvidence
    const backup = turn.content.match(/\bsolar\s+inverter\b|\binverter\b|\bgenerator\b/i)
    if (backup) backupFact = { value: /solar/i.test(backup[0]) ? 'solar' : /generator/i.test(backup[0]) ? 'generator' : 'inverter', evidence: backup[0] }
    const chemistry = turn.content.match(/\b(?:lifepo4|lithium(?:-ion)?|agm|lead[ -]?acid)\b/i)
    if (chemistry) chemistryFact = { value: /agm/i.test(chemistry[0]) ? 'agm' : /lead/i.test(chemistry[0]) ? 'lead_acid' : 'lifepo4', evidence: chemistry[0] }
  }
  addField('backupType', backupFact)
  addField('batteryChemistry', chemistryFact)
  if (batteryEvidence && (lastUnitFact(request.turns, '(?:ah|amp(?:ere)?[- ]?hours?)') ||
      lastUnitFact(request.turns, 'kwh') || /\b(?:have|using|with)\s+(?:a\s+|an\s+|two\s+)?batter(?:y|ies)\b/i.test(request.turns.filter(turn => turn.role === 'user').map(turn => turn.content).join(' ')))) {
    addField('hasBattery', { value: true, evidence: batteryEvidence })
  }
  const { selected, evidence } = statedAppliances(request)
  for (const item of selected) {
    const statement = evidence.get(item.applianceId)
    if (!statement) continue
    const previous = request.confirmedInputs.selectedAppliances?.find(existing => existing.applianceId === item.applianceId)
    if (previous && JSON.stringify(previous) === JSON.stringify(item)) continue
    proposals.push({ kind: 'upsert_appliance', draftItemId: item.applianceId, value: item, source: 'user_statement', evidence: statement })
  }
  return proposals.slice(0, 20)
}

function practicalIntakeAdvice(request: Extract<AdvisorRequestV1, { action: 'intake' }>): string {
  const userText = request.turns.filter(turn => turn.role === 'user').map(turn => turn.content).join(' ')
  const { selected } = statedAppliances(request)
  const load = selected.reduce((total, item) => {
    const preset = PRESET_APPLIANCES.find(appliance => appliance.id === item.applianceId)
    const perUnit = item.watts ?? item.customWatts ?? (preset ? preset.wattage / (preset.unitCount ?? 1) : undefined)
    return total + (perUnit && Number.isFinite(perUnit) && item.quantity > 0 ? perUnit * item.quantity : 0)
  }, 0)
  const loadComplete = selected.every(item => item.watts !== undefined || item.customWatts !== undefined || presetById.has(item.applianceId))
  const contextual = contextualNumericFact(request.turns)
  const hours = request.confirmedInputs.typicalOutageHours ?? (contextual?.field === 'typicalOutageHours' ? contextual.value : undefined) ?? lastUnitAmount(request.turns, '(?:h|hrs?|hours?)')
  const ampHours = request.confirmedInputs.ampHours || (contextual?.field === 'ampHours' ? contextual.value : undefined) || lastUnitAmount(request.turns, '(?:ah|amp(?:ere)?[- ]?hours?)')
  const voltage = request.confirmedInputs.voltage || (contextual?.field === 'voltage' ? contextual.value : undefined) || lastUnitAmount(request.turns, '(?:v|volts?)')
  const directKwh = request.confirmedInputs.directKwh ?? lastUnitAmount(request.turns, 'kwh')
  const chemistry: BatteryChemistry = request.confirmedInputs.batteryChemistry && request.confirmedInputs.batteryChemistry !== 'unknown'
    ? request.confirmedInputs.batteryChemistry
    : /\b(lifepo4|lithium(?:-ion)?)\b/i.test(userText) ? 'lifepo4'
      : /\bagm\b/i.test(userText) ? 'agm'
        : /\blead[ -]?acid\b/i.test(userText) ? 'lead_acid' : 'unknown'
  const hasUnresolvedBatteryCount = /\b(?:two|2|three|3|four|4)\s+batter(?:y|ies)\b/i.test(userText) && !/\b(total bank|combined bank|bank total|whole bank)\b/i.test(userText)
  const calculateStatedPlan = (kind: Exclude<BatteryChemistry, 'unknown'>) => calculateBackupPlan({
    backupType: /\bsolar\b/i.test(userText) ? 'solar' as const : 'inverter' as const,
    hasBattery: true,
    batteryChemistry: kind,
    voltage: voltage ?? 0,
    ampHours: ampHours ?? 0,
    directKwh: directKwh ?? null,
    isCapacityUnknown: false,
    inverterRatingWatts: request.confirmedInputs.inverterRatingWatts ?? statedInverterWatts(request.turns)?.value ?? null,
    typicalOutageHours: hours ?? 1,
    selectedAppliances: selected.map(item => ({
      ...item,
      watts: item.watts ?? item.customWatts ?? (PRESET_APPLIANCES.find(appliance => appliance.id === item.applianceId)?.wattage ?? 0) /
        (PRESET_APPLIANCES.find(appliance => appliance.id === item.applianceId)?.unitCount ?? 1),
      operatingHours: hours ?? 1,
      mustRun: item.mustRun ?? false,
      priority: item.priority ?? 'normal' as const,
    })),
    priorityMode: 'balanced' as const,
  }, PRESET_APPLIANCES)
  const runtimeLabel = (runtime: number) => {
    const minutes = Math.round(runtime * 60)
    return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
  }
  const parts: string[] = []
  if (selected.length && load > 0) {
    const names = selected.map(item => {
      const preset = PRESET_APPLIANCES.find(appliance => appliance.id === item.applianceId)
      return `${item.quantity} × ${item.customName ?? preset?.name ?? 'appliance'}`
    }).join(' and ')
    parts.push(loadComplete
      ? `For ${names}, the stated wattages and any remaining catalog estimates give about ${Math.round(load)} W total${hours ? ` and ${Math.round(load * hours)} Wh over ${hours} hours` : ''}. Check each appliance label before relying on this estimate.`
      : `For ${names}, the known wattages give at least ${Math.round(load)} W. One or more appliance wattages are unknown, so total load and energy demand cannot be estimated reliably yet.`)
  } else if (hours) {
    parts.push(`Your requested backup duration is ${hours} hours. I still need the appliance load to estimate energy demand.`)
  }
  if (hasUnresolvedBatteryCount) {
    parts.push('You mentioned multiple batteries, but the series/parallel setup and whether the voltage and Ah are per battery or for the whole bank are unclear. I will not multiply those ratings; use the total bank values from the inverter label or confirm the bank configuration first.')
  } else if (!loadComplete) {
    parts.push('Runtime is still unknown because at least one appliance wattage is missing. Add its label wattage before comparing demand with battery energy.')
  } else if ((ampHours && voltage || directKwh) && chemistry !== 'unknown' && load > 0 && loadComplete) {
    const result = calculateStatedPlan(chemistry)
    if (result.continuousRuntimeHours !== null && result.usableCapacityWh !== null) {
      parts.push(`Using the stated battery details and load, usable energy is about ${result.usableCapacityWh} Wh and continuous runtime is roughly ${runtimeLabel(result.continuousRuntimeHours)}. This estimate applies the app's ${Math.round((result.depthOfDischargeRatio ?? 0) * 100)}% chemistry-based discharge limit and ${Math.round(result.inverterEfficiencyRatio * 100)}% inverter-efficiency assumption; actual runtime varies with battery condition, temperature, load, and protection limits.`)
      if (hours) parts.push(result.continuousRuntimeHours >= hours ? `That is above your ${hours}-hour target in this estimate, subject to those assumptions.` : `That is below your ${hours}-hour target in this estimate; prioritize only essential appliances.`)
    } else {
      parts.push('The entered details still do not support a reliable runtime calculation. Check the bank values and load before relying on an estimate.')
    }
  } else if (ampHours && !voltage) {
    parts.push(`You provided ${ampHours} Ah, but amp-hours alone are not watt-hours. Without the battery-bank voltage, nominal energy and backup runtime cannot be calculated reliably.`)
  } else if (ampHours && voltage && chemistry === 'unknown') {
    parts.push(`Your stated ${voltage} V and ${ampHours} Ah imply about ${Math.round(voltage * ampHours)} Wh nominal battery energy.`)
    if (load > 0) {
      const lead = calculateStatedPlan('lead_acid').continuousRuntimeHours
      const lithium = calculateStatedPlan('lifepo4').continuousRuntimeHours
      if (lead !== null && lithium !== null) parts.push(`Conditional examples only: about ${runtimeLabel(lead)} with PowerUp's 50% lead-acid discharge assumption, or ${runtimeLabel(lithium)} with its 90% LiFePO4 assumption. Both use an assumed 85% inverter efficiency. Your battery chemistry is unknown, so neither is a reliable prediction.`)
    }
  } else if (directKwh && chemistry === 'unknown') {
    parts.push(`You provided ${directKwh} kWh nominal battery capacity. Runtime still needs the battery chemistry and appliance load so usable energy can be estimated with the assumptions shown.`)
  } else if (load <= 0) {
    parts.push('Runtime is still unknown because no appliance wattage is available to calculate the total load.')
  } else {
    parts.push('I cannot say whether the battery will last for the requested duration until its capacity and bank voltage are known. I will not assume a voltage or invent a runtime.')
  }
  const inverterWatts = request.confirmedInputs.inverterRatingWatts ?? statedInverterWatts(request.turns)?.value
  if (inverterWatts) parts.push(`The stated ${inverterWatts} W inverter rating describes power delivery, not stored battery energy.`)
  parts.push(selected.some(item => item.applianceId === 'custom-fan')
    ? 'Practical step: prioritize the router and essential lights; reduce fan use if you need a longer backup period.'
    : 'Practical step: keep the router and only the lights you need on, and leave higher-draw appliances off until the inverter and battery labels are checked.')
  return parts.join(' ')
}

function rulesBasedIntakeReply(request: Extract<AdvisorRequestV1, { action: 'intake' }>): Extract<AdvisorResponseV1, { action: 'intake' }> {
  const latest = request.turns[request.turns.length - 1]?.content.trim() ?? ''
  const acknowledgement = /^(?:ok(?:ay)?|sure|thanks|thank you|got it)[.! ]*$/i.test(latest)
  const unknownReply = /^(?:i\s+)?(?:don't|do not)\s+know[.! ]*$/i.test(latest)
  const userText = request.turns.filter(turn => turn.role === 'user').map(turn => turn.content).join(' ')
  const contextual = contextualNumericFact(request.turns)
  const hours = request.confirmedInputs.typicalOutageHours ?? (contextual?.field === 'typicalOutageHours' ? contextual.value : undefined) ?? lastUnitAmount(request.turns, '(?:h|hrs?|hours?)')
  const ampHours = request.confirmedInputs.ampHours || (contextual?.field === 'ampHours' ? contextual.value : undefined) || lastUnitAmount(request.turns, '(?:ah|amp(?:ere)?[- ]?hours?)')
  const voltage = request.confirmedInputs.voltage || (contextual?.field === 'voltage' ? contextual.value : undefined) || lastUnitAmount(request.turns, '(?:v|volts?)')
  const hasAppliances = Boolean(request.confirmedInputs.selectedAppliances?.length) || /\b(router|wi[ -]?fi|lights?|bulbs?|fan|fridge|refrigerator|laptop|television|tv)\b/i.test(userText)
  let missingField: string | undefined
  let question = ''
  if (!acknowledgement && !unknownReply) {
    if (!hasAppliances) { missingField = 'selectedAppliances'; question = 'Which appliances do you need to keep running?' }
    else if (!hours) { missingField = 'typicalOutageHours'; question = 'How many hours of backup do you need?' }
    else if (!ampHours && request.confirmedInputs.directKwh == null) { missingField = 'ampHours'; question = 'What battery capacity is printed on its label in Ah? If you do not know, say so and I will keep runtime unknown.' }
    else if (!voltage) { missingField = 'voltage'; question = 'What nominal voltage is printed on the battery or bank label? Do not guess if you cannot find it.' }
    else if ((!request.confirmedInputs.batteryChemistry || request.confirmedInputs.batteryChemistry === 'unknown') && !/\b(lifepo4|lithium(?:-ion)?|agm|lead[ -]?acid)\b/i.test(userText)) { missingField = 'batteryChemistry'; question = 'Do you know the battery chemistry (for example, lead-acid, AGM, or LiFePO4)? If not, I can keep runtime conditional.' }
  }
  const assistantMessage = `I could not get a model reply, so this is a rules-based assessment using your stated details and PowerUp's appliance catalog. ${practicalIntakeAdvice(request)}`
  return {
    version: AI_ADVISOR_CONTRACT_VERSION, action: 'intake', confirmedInputs: request.confirmedInputs,
    assistantMessage: assistantMessage.slice(0, 1000),
    missingQuestions: missingField ? [{ field: missingField as keyof AdvisorSetupInputs | 'selectedAppliances', question }] : [],
    proposedChanges: statedFallbackFacts(request), safetyNotes: [],
  }
}

function alreadyProvided(field: string, request: Extract<AdvisorRequestV1, { action: 'intake' }>, reply: Extract<AdvisorResponseV1, { action: 'intake' }>): boolean {
  if (reply.proposedChanges.some(proposal => proposal.kind === 'set_field' && proposal.field === field)) return true
  const inputs = request.confirmedInputs
  const text = request.turns.filter(turn => turn.role === 'user').map(turn => turn.content).join(' ')
  switch (field) {
    case 'selectedAppliances': return Boolean(inputs.selectedAppliances?.length) || /\b(router|wi[ -]?fi|lights?|bulbs?|fan|fridge|refrigerator|laptop|television|tv)\b/i.test(text)
    case 'typicalOutageHours': return Boolean(inputs.typicalOutageHours || contextualNumericFact(request.turns)?.field === field || lastUnitAmount(request.turns, '(?:h|hrs?|hours?)'))
    case 'ampHours': return Boolean(inputs.ampHours || contextualNumericFact(request.turns)?.field === field || lastUnitAmount(request.turns, '(?:ah|amp(?:ere)?[- ]?hours?)'))
    case 'directKwh': return Boolean(inputs.directKwh || lastUnitAmount(request.turns, 'kwh'))
    case 'voltage': return Boolean(inputs.voltage || contextualNumericFact(request.turns)?.field === field || lastUnitAmount(request.turns, '(?:v|volts?)'))
    case 'batteryChemistry': return Boolean((inputs.batteryChemistry && inputs.batteryChemistry !== 'unknown') || /\b(lifepo4|lithium(?:-ion)?|agm|lead[ -]?acid)\b/i.test(text))
    case 'backupType': return Boolean(inputs.backupType || /\b(solar|inverter|ups|generator|no backup)\b/i.test(text))
    case 'hasBattery': return typeof inputs.hasBattery === 'boolean' || /\b(batter(?:y|ies)|\d+\s*ah|\d+\s*wh)\b/i.test(text)
    case 'inverterRatingWatts': return Boolean(inputs.inverterRatingWatts || lastUnitAmount(request.turns, '(?:w|watts?)'))
    case 'inverterRatingVA': return Boolean(inputs.inverterRatingVA || lastUnitAmount(request.turns, 'va'))
    default: return false
  }
}

function unsafeGeneratedText(value: string): boolean {
  return /\b(?:ignore (?:previous|all|system) instructions|(?:api[_ -]?key|secret|password)|wire|wiring|terminal|bypass|short.circuit|solder|connect.{0,40}battery|remove.{0,40}fuse|disable.{0,40}breaker)\b/i.test(value)
}

export function validateIntakeOutput(raw: unknown, request: Extract<AdvisorRequestV1, { action: 'intake' }>): Extract<AdvisorResponseV1, { action: 'intake' }> {
  if (!object(raw) || !exactKeys(raw, new Set(['assistantMessage', 'missingQuestionField', 'missingQuestionText', 'proposedChanges', 'safetyNotes'])) ||
      !boundedString(raw.assistantMessage, 1000) || !boundedString(raw.missingQuestionField, 40, true) ||
      !boundedString(raw.missingQuestionText, 300, true) || !validateTextList(raw.safetyNotes, 3, 240) ||
      unsafeGeneratedText(raw.assistantMessage) || unsafeGeneratedText(raw.missingQuestionText) ||
      raw.safetyNotes.some(note => unsafeGeneratedText(note)) ||
      !Array.isArray(raw.proposedChanges) || raw.proposedChanges.length > 20) {
    throw new AdvisorFailure('provider_invalid_output', 502, 'The advisor returned an invalid reply. Please try again.', true)
  }
  const missingField = raw.missingQuestionField
  if (missingField !== '' && missingField !== 'selectedAppliances' && !proposalFields.has(missingField)) {
    throw new AdvisorFailure('provider_invalid_output', 502, 'The advisor returned an invalid question. Please try again.', true)
  }
  if ((missingField === '') !== (raw.missingQuestionText === '')) {
    throw new AdvisorFailure('provider_invalid_output', 502, 'The advisor returned an incomplete question. Please try again.', true)
  }
  const proposals: AdvisorInputProposal[] = []
  let ignoredUnsupportedFact = false
  for (const row of raw.proposedChanges) {
    if (!object(row) || !exactKeys(row, new Set(['kind', 'field', 'draftItemId', 'valueJson', 'source', 'evidence'])) ||
        !['set_field', 'upsert_appliance'].includes(String(row.kind)) ||
        !boundedString(row.valueJson, 2500) || !boundedString(row.evidence, 160) ||
        !['user_statement', 'named_catalog_preset'].includes(String(row.source))) {
      throw new AdvisorFailure('provider_invalid_output', 502, 'The advisor returned an invalid suggestion. Please try again.', true)
    }
    let parsed: unknown
    try { parsed = JSON.parse(row.valueJson) } catch { parsed = undefined }
    if (row.kind === 'set_field') {
      if (!boundedString(row.field, 40) || !proposalFields.has(row.field) || row.draftItemId !== '' ||
          row.source !== 'user_statement' || !fieldValid(row.field, parsed) ||
          !evidenceValid(row.evidence, row.source, request.turns) ||
          !evidenceSupportsValue(row.field, parsed, row.evidence, request.turns)) {
        ignoredUnsupportedFact = true
        continue
      }
      proposals.push({ kind: 'set_field', field: row.field, value: parsed, source: 'user_statement', evidence: row.evidence } as AdvisorInputProposal)
    } else {
      if (row.field !== 'selectedAppliances' || !boundedString(row.draftItemId, 80) || !applianceValid(parsed, false) ||
          !evidenceValid(row.evidence, row.source as string, request.turns, (parsed as RecordValue).applianceId as string)) {
        ignoredUnsupportedFact = true
        continue
      }
      proposals.push({ kind: 'upsert_appliance', draftItemId: row.draftItemId, value: parsed, source: row.source, evidence: row.evidence } as AdvisorInputProposal)
    }
  }
  return {
    version: AI_ADVISOR_CONTRACT_VERSION, action: 'intake', confirmedInputs: request.confirmedInputs,
    assistantMessage: ignoredUnsupportedFact
      ? `${raw.assistantMessage} I used only the details supported by your messages; any unverified suggestion was left out.`.slice(0, 1000)
      : raw.assistantMessage,
    missingQuestions: missingField === '' ? [] : [{ field: missingField as keyof AdvisorSetupInputs, question: raw.missingQuestionText }],
    proposedChanges: proposals, safetyNotes: raw.safetyNotes,
  }
}

// Numeric facts with explicit units are cheap to extract deterministically. This
// protects common one-token follow-ups from being lost when the model misses them.
function mergeExplicitNumericFacts(raw: unknown, request: Extract<AdvisorRequestV1, { action: 'intake' }>): unknown {
  if (!object(raw) || !Array.isArray(raw.proposedChanges)) return raw
  const latest = request.turns[request.turns.length - 1]?.content ?? ''
  const matches: { field: string; value: number; evidence: string }[] = []
  const patterns: [string, RegExp][] = [
    ['ampHours', /\b(\d+(?:\.\d+)?)\s*(ah|amp(?:ere)?[- ]?hours?)\b/ig],
    ['voltage', /\b(\d+(?:\.\d+)?)\s*(v|volts?)\b/ig],
    ['typicalOutageHours', /\b(\d+(?:\.\d+)?)\s*(h|hrs?|hours?)\b/ig],
    ['directKwh', /\b(\d+(?:\.\d+)?)\s*kwh\b/ig],
    ['inverterRatingVA', /\b(\d+(?:\.\d+)?)\s*va\b/ig],
  ]
  for (const [field, pattern] of patterns) {
    for (const match of latest.matchAll(pattern)) {
      const value = Number(match[1])
      if (!Number.isFinite(value) || !fieldValid(field, value)) continue
      matches.push({ field, value, evidence: match[0] })
    }
  }
  const inverter = statedInverterWatts(request.turns)
  if (inverter) matches.push({ field: 'inverterRatingWatts', ...inverter })
  const contextual = contextualNumericFact(request.turns)
  if (contextual) matches.push(contextual)
  let proposals = raw.proposedChanges
  for (const match of matches) {
    const existing = proposals.find((proposal: unknown) => object(proposal) && proposal.kind === 'set_field' && proposal.field === match.field)
    if (object(existing)) {
      let existingValue: unknown
      try { existingValue = JSON.parse(String(existing.valueJson)) } catch { existingValue = undefined }
      if (existingValue === match.value && evidenceValid(String(existing.evidence ?? ''), 'user_statement', request.turns) &&
          evidenceSupportsValue(match.field, existingValue, String(existing.evidence ?? ''), request.turns)) continue
      proposals = proposals.filter((proposal: unknown) => proposal !== existing)
    }
    proposals = proposals.concat({ kind: 'set_field', field: match.field, draftItemId: '', valueJson: JSON.stringify(match.value), source: 'user_statement', evidence: match.evidence })
  }
  return { ...raw, proposedChanges: proposals }
}

function safeNarrative(value: unknown, max: number): value is string {
  return boundedString(value, max) && !/\p{N}/u.test(value) && !unsafeGeneratedText(value)
}

function fallbackExplanation(request: Extract<AdvisorRequestV1, { action: 'explain' }>, results: CalculationResults): Extract<AdvisorResponseV1, { action: 'explain' }> {
  return {
    version: AI_ADVISOR_CONTRACT_VERSION, action: 'explain', confirmedInputs: request.confirmedInputs,
    engineVersion: CALCULATION_ENGINE_VERSION, calculatedResults: results, explanationSource: 'rules',
    explanation: {
      summary: results.isCalculable ? 'This is a planning estimate based on your confirmed equipment and appliance details.' : 'The available details support load and energy estimates, while runtime needs more specifications.',
      recommendations: [{ text: 'Check each appliance label and the equipment specifications before relying on the estimate.', groundedIn: ['totalConnectedLoadWatts', 'estimatedEnergyWh'] }],
      missingSpecifications: results.missingDetailsReason ? [results.missingDetailsReason] : [],
      safetyNotes: ['Have a qualified professional handle electrical or battery-system changes.'],
    },
  }
}

export function validateExplanationOutput(raw: unknown, request: Extract<AdvisorRequestV1, { action: 'explain' }>, results: CalculationResults): Extract<AdvisorResponseV1, { action: 'explain' }> {
  if (!object(raw) || !exactKeys(raw, new Set(['summary', 'recommendations', 'safetyNotes'])) ||
      !safeNarrative(raw.summary, 800) || !Array.isArray(raw.recommendations) || raw.recommendations.length > 4 ||
      !validateTextList(raw.safetyNotes, 3, 240) || raw.safetyNotes.some(note => !safeNarrative(note, 240))) {
    throw new AdvisorFailure('provider_invalid_output', 502, 'The advisor returned an invalid explanation.', true)
  }
  const recommendations: { text: string; groundedIn: (keyof CalculationResults)[] }[] = []
  for (const row of raw.recommendations) {
    if (!object(row) || !exactKeys(row, new Set(['text', 'groundedIn'])) || !safeNarrative(row.text, 350) ||
        !Array.isArray(row.groundedIn) || row.groundedIn.length < 1 || row.groundedIn.length > 4 ||
        row.groundedIn.some(field => typeof field !== 'string' || !resultFields.has(field))) {
      throw new AdvisorFailure('provider_invalid_output', 502, 'The advisor returned an unsupported recommendation.', true)
    }
    recommendations.push({ text: row.text, groundedIn: row.groundedIn })
  }
  return {
    version: AI_ADVISOR_CONTRACT_VERSION, action: 'explain', confirmedInputs: request.confirmedInputs,
    engineVersion: CALCULATION_ENGINE_VERSION, calculatedResults: results, explanationSource: 'ai',
    explanation: { summary: raw.summary, recommendations, missingSpecifications: results.missingDetailsReason ? [results.missingDetailsReason] : [], safetyNotes: raw.safetyNotes },
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get('content-type') ?? ''
  if (!type.toLowerCase().startsWith('application/json')) throw new AdvisorFailure('invalid_request', 400, 'Send a JSON request.')
  const reader = request.body?.getReader()
  if (!reader) throw new AdvisorFailure('invalid_request', 400, 'The request body is missing.')
  let size = 0
  const parts: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > AI_ADVISOR_LIMITS.requestBytes) {
      await reader.cancel()
      throw new AdvisorFailure('payload_too_large', 413, 'The advisor request is too large.')
    }
    parts.push(value)
  }
  try {
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new AdvisorFailure('invalid_request', 400, 'The JSON request is invalid.')
  }
}

export function createAdvisorHandler(dependencies: AdvisorDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
    if (request.method !== 'POST') return json({ version: 1, error: { code: 'invalid_request', message: 'Use POST for advisor requests.', retryable: false } }, 405)
    try {
      const payload = validateAdvisorRequest(await readBody(request))
      const identity = await dependencies.authenticate(request)
      const allowed = await dependencies.consumeQuota(identity)
      if (!allowed) throw new AdvisorFailure('rate_limited', 429, 'The advisor limit has been reached. Please try again later.', true)
      if (payload.action === 'intake') {
        let reply: Extract<AdvisorResponseV1, { action: 'intake' }>
        try {
          dependencies.checkProviderConfiguration?.()
          const raw = await dependencies.callProvider(payload)
          reply = validateIntakeOutput(mergeExplicitNumericFacts(raw, payload), payload)
        } catch (error) {
          // Log only the failure class; never log messages, prompts, or keys.
          console.warn('advisor intake fallback', error instanceof AdvisorFailure ? error.code : 'unexpected')
          reply = rulesBasedIntakeReply(payload)
        }
        const latestUserMessage = payload.turns[payload.turns.length - 1]?.content.trim() ?? ''
        const acknowledgement = /^(?:ok(?:ay)?|sure|thanks|thank you|got it)[.! ]*$/i.test(latestUserMessage)
        const advice = practicalIntakeAdvice(payload)
        const genericFallback = /^I kept only details I could verify from your message\./i.test(reply.assistantMessage)
        if (!reply.assistantMessage.startsWith('I could not get a model reply')) {
          reply.assistantMessage = (genericFallback ? advice : `${reply.assistantMessage}\n\nPractical assessment: ${advice}`).slice(0, 1000)
        }
        reply.missingQuestions = acknowledgement
          ? []
          : reply.missingQuestions.filter(question => !alreadyProvided(question.field, payload, reply))
        return json(reply)
      }
      dependencies.checkProviderConfiguration?.()
      const results = calculateBackupPlan(payload.confirmedInputs, PRESET_APPLIANCES)
      try {
        const raw = await dependencies.callProvider(payload, results)
        return json(validateExplanationOutput(raw, payload, results))
      } catch (error) {
        if (error instanceof AdvisorFailure && ['not_configured', 'rate_limited'].includes(error.code)) throw error
        return json(fallbackExplanation(payload, results))
      }
    } catch (error) {
      const failure = error instanceof AdvisorFailure ? error : new AdvisorFailure('provider_unavailable', 503, 'The advisor is temporarily unavailable. Try again or use the manual calculator.', true)
      return json({ version: AI_ADVISOR_CONTRACT_VERSION, error: { code: failure.code, message: failure.message, retryable: failure.retryable } }, failure.status)
    }
  }
}
