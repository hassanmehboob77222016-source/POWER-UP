import type { Appliance } from '@/lib/appliances-data'
import type { BackupType, BatteryChemistry, PriorityMode, SetupInputs } from '@/lib/calculations'

export interface BackupChatAppliance {
  name: string
  catalogId: string | null
  quantity: number
  wattage: number | null
  category: Appliance['category'] | null
  desiredHours: number | null
  priority: 'essential' | 'normal' | 'optional' | null
  excluded: boolean
}

export interface BackupChatState {
  backupType: BackupType | null
  outageHours: number | null
  outageFrequency: string | null
  outageStartTime: string | null
  batteryChemistry: BatteryChemistry | null
  voltage: number | null
  ampHours: number | null
  capacityKwh: number | null
  batteryQuantity: number | null
  batterySpecsUnknown: boolean
  batterySpecsConflict: boolean
  inverterRatingWatts: number | null
  inverterRatingVA: number | null
  inverterRatingUnknown: boolean
  surgeWatts: number | null
  appliances: BackupChatAppliance[]
  priorities: string[]
  priorityMode: PriorityMode | null
}

export interface BackupChatMessage { role: 'user' | 'assistant'; content: string }
export type BackupChatQuestionField = 'backupType' | 'outageHours' | 'appliance' | 'batterySpecs' | 'applianceWattage' | 'inverterRating' | 'none'
export interface BackupChatResponse {
  assistantMessage: string
  questionField: BackupChatQuestionField
  state: BackupChatState
}

export function createEmptyBackupChatState(): BackupChatState {
  return {
    backupType: null, outageHours: null, outageFrequency: null, outageStartTime: null,
    batteryChemistry: null, voltage: null, ampHours: null, capacityKwh: null,
    batteryQuantity: null, batterySpecsUnknown: false, batterySpecsConflict: false, inverterRatingWatts: null,
    inverterRatingVA: null, inverterRatingUnknown: false, surgeWatts: null,
    appliances: [], priorities: [], priorityMode: null,
  }
}

const validNumber = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null
const safeString = (value: unknown, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : null

const applianceWattAliases: Record<string, string[]> = {
  'ceiling-fan': ['ceiling fan', 'fan', 'fans'],
  'dc-inverter-fan': ['dc fan', 'inverter fan', 'bldc fan', 'fan', 'fans'],
  'standing-fan': ['standing fan', 'portable fan', 'fan', 'fans'],
  'led-lights': ['led light', 'lights', 'light', 'bulbs', 'bulb'],
  'desk-lamp': ['desk lamp', 'lamp'],
  'inverter-fridge': ['refrigerator', 'fridge'],
  'smart-tv': ['television', 'smart tv', 'tv'],
  'wifi-router': ['wi-fi router', 'wifi router', 'router'],
}

function getExplicitUserWattage(name: string, catalogId: string | null, messages: BackupChatMessage[]): number | null {
  const aliases = [...(catalogId ? applianceWattAliases[catalogId] || [] : []), name.toLowerCase()]
    .map(alias => alias.trim()).filter(Boolean)
  const wattPattern = /(\d+(?:\.\d+)?)\s*(?:w|watts?)\b/gi
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex]
    if (message.role !== 'user') continue
    const source = message.content.toLowerCase()
    const mentions = aliases.flatMap(alias => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return [...source.matchAll(new RegExp(`\\b${escaped}\\b`, 'gi'))].map(match => match.index ?? -1).filter(index => index >= 0)
    })
    if (mentions.length && /\b(?:don'?t know|not sure|unknown|pata nahi|maloom nahi)\b/i.test(source)) return null
    const wattMatches = [...source.matchAll(wattPattern)].flatMap(match => {
      const index = match.index ?? -1
      const value = Number(match[1])
      if (index < 0 || !Number.isFinite(value) || value <= 0 || value > 10000) return []
      const technicalContext = source.slice(Math.max(0, index - 12), Math.min(source.length, index + match[0].length + 12))
      if (/\b(inverter|battery|bank|surge|capacity|rating|solar|generator)\b/i.test(technicalContext)) return []
      if (mentions.some(position => Math.abs(position - index) <= 25)) return [{ value, index }]
      return []
    })
    if (!mentions.length && messageIndex > 0) {
      const priorAssistant = [...messages.slice(0, messageIndex)].reverse().find(item => item.role === 'assistant')?.content.toLowerCase() || ''
      const assistantAskedForWatts = /wattage|watts?|power rating/.test(priorAssistant)
      const assistantNamedAppliance = aliases.some(alias => priorAssistant.includes(alias))
      if (assistantAskedForWatts && assistantNamedAppliance && wattMatches.length) return wattMatches.sort((a, b) => b.index - a.index)[0].value
    }
    if (wattMatches.length) return wattMatches.sort((a, b) => b.index - a.index)[0].value
  }
  return null
}

export function sanitizeBackupChatResponse(value: unknown, catalog: Appliance[], messages: BackupChatMessage[]): BackupChatResponse | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const rawState = raw.state
  if (!rawState || typeof rawState !== 'object') return null
  const source = rawState as Record<string, unknown>
  const backupTypes: BackupType[] = ['inverter', 'solar', 'generator', 'none']
  const chemistries: BatteryChemistry[] = ['lifepo4', 'lead_acid', 'agm', 'unknown']
  const priorities = ['essential', 'normal', 'optional'] as const
  const appliances = Array.isArray(source.appliances) ? source.appliances.slice(0, 20).flatMap((entry): BackupChatAppliance[] => {
    if (!entry || typeof entry !== 'object') return []
    const appliance = entry as Record<string, unknown>
    const name = safeString(appliance.name, 80)
    const quantity = validNumber(appliance.quantity, 1, 99)
    if (!name || !quantity) return []
    const candidateId = safeString(appliance.catalogId, 80)
    const catalogId = candidateId && catalog.some(item => item.id === candidateId) ? candidateId : null
    const categories: Appliance['category'][] = ['connectivity', 'lighting', 'cooling', 'kitchen', 'critical']
    const category = categories.includes(appliance.category as Appliance['category']) ? appliance.category as Appliance['category'] : catalog.find(item => item.id === catalogId)?.category ?? null
    const priority = priorities.includes(appliance.priority as typeof priorities[number]) ? appliance.priority as BackupChatAppliance['priority'] : null
    return [{
      name,
      catalogId,
      quantity: Math.floor(quantity),
      wattage: getExplicitUserWattage(name, catalogId, messages),
      category,
      desiredHours: validNumber(appliance.desiredHours, 0.25, 24),
      priority,
      excluded: appliance.excluded === true,
    }]
  }) : []

  const questionFields: BackupChatQuestionField[] = ['backupType', 'outageHours', 'appliance', 'batterySpecs', 'applianceWattage', 'inverterRating', 'none']
  const questionField = questionFields.includes(raw.questionField as BackupChatQuestionField) ? raw.questionField as BackupChatQuestionField : 'none'
  const backupType = backupTypes.includes(source.backupType as BackupType) ? source.backupType as BackupType : null
  const batteryChemistry = chemistries.includes(source.batteryChemistry as BatteryChemistry) ? source.batteryChemistry as BatteryChemistry : null
  const mode = ['maximum_runtime', 'balanced', 'critical_only'].includes(String(source.priorityMode)) ? source.priorityMode as PriorityMode : null
  const voltage = validNumber(source.voltage, 1, 1000)
  const ampHours = validNumber(source.ampHours, 1, 10000)
  const capacityKwh = validNumber(source.capacityKwh, 0.01, 1000)
  const batterySpecsConflict = Boolean(voltage && ampHours && capacityKwh && Math.abs(capacityKwh * 1000 - voltage * ampHours) / Math.max(capacityKwh * 1000, voltage * ampHours) > 0.15)

  const state: BackupChatState = {
    backupType,
    outageHours: validNumber(source.outageHours, 0.25, 24),
    outageFrequency: safeString(source.outageFrequency, 80),
    outageStartTime: safeString(source.outageStartTime, 40),
    batteryChemistry,
    voltage,
    ampHours,
    capacityKwh,
    batteryQuantity: validNumber(source.batteryQuantity, 1, 100),
    batterySpecsUnknown: source.batterySpecsUnknown === true,
    batterySpecsConflict,
    inverterRatingWatts: validNumber(source.inverterRatingWatts, 1, 100000),
    inverterRatingVA: validNumber(source.inverterRatingVA, 1, 100000),
    inverterRatingUnknown: source.inverterRatingUnknown === true,
    surgeWatts: validNumber(source.surgeWatts, 1, 200000),
    appliances,
    priorities: Array.isArray(source.priorities) ? source.priorities.flatMap(item => { const text = safeString(item, 100); return text ? [text] : [] }).slice(0, 10) : [],
    priorityMode: mode,
  }
  const assistantMessage = safeString(raw.assistantMessage, 1200)?.replace(/\b\d+(?:\.\d+)?\s*(?:watts?|w)\b/gi, 'that wattage') || null
  if (!assistantMessage) return null
  return { assistantMessage, questionField, state }
}

export function nextRequiredQuestion(state: BackupChatState): { field: BackupChatQuestionField; question: string } | null {
  if (!state.backupType) return { field: 'backupType', question: 'What backup setup do you have: an inverter or UPS with battery, solar with battery, a generator, or no backup system yet?' }
  if (!state.outageHours) return { field: 'outageHours', question: 'About how many hours does a typical outage last?' }
  if (state.appliances.filter(item => !item.excluded).length === 0) return { field: 'appliance', question: 'Which appliances would you like to run during an outage? You can list them naturally, such as fans, lights, a fridge, or a TV.' }
  if (['inverter', 'solar'].includes(state.backupType)) {
    if (state.batterySpecsConflict) return { field: 'batterySpecs', question: `The battery figures do not agree: ${state.voltage}V × ${state.ampHours}Ah is different from ${state.capacityKwh}kWh. Which figure describes the total connected battery bank? Please confirm the label values before I estimate runtime.` }
    const hasCapacity = Boolean(state.capacityKwh || (state.voltage && state.ampHours))
    if (!hasCapacity && !state.batterySpecsUnknown) return { field: 'batterySpecs', question: 'What does the battery label show for the total bank voltage and capacity (for example, 24V and 150Ah)? If you are not sure, say so and I can continue without runtime estimates.' }
    if (hasCapacity && !state.batteryChemistry) return { field: 'batterySpecs', question: 'Do you know the battery chemistry, such as LiFePO₄, lead-acid, or AGM/GEL? If not, say “unknown” and I will label that assumption.' }
  }
  const unpriced = state.appliances.find(item => !item.excluded && !item.wattage && !catalogMatch(item))
  if (unpriced) return { field: 'applianceWattage', question: `I do not have a reliable PowerUp preset for ${unpriced.name}. Do you know its wattage? If you do not, you can exclude it from the numeric estimate.` }
  if (!['none', 'generator'].includes(state.backupType) && !state.inverterRatingWatts && !state.inverterRatingVA && !state.inverterRatingUnknown) {
    return { field: 'inverterRating', question: 'What continuous inverter rating do you have in watts or VA? If you cannot find it, say “unknown” and I will leave inverter headroom unchecked.' }
  }
  return null
}

function catalogMatch(item: BackupChatAppliance): boolean {
  return Boolean(item.catalogId)
}

export function toSetupInputs(state: BackupChatState, catalog: Appliance[]): SetupInputs {
  const selectedAppliances = state.appliances.filter(item => !item.excluded).flatMap(item => {
    const preset = item.catalogId ? catalog.find(appliance => appliance.id === item.catalogId) : undefined
    if (preset) return [{ applianceId: preset.id, quantity: item.quantity, customWatts: item.wattage ?? (preset.unitCount ? preset.wattage / preset.unitCount : undefined) }]
    if (item.wattage) return [{ applianceId: `chat-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)}`, quantity: item.quantity, customName: item.name, customWatts: item.wattage }]
    return []
  })
  const notes = [
    state.outageFrequency ? `Outage frequency: ${state.outageFrequency}` : null,
    state.outageStartTime ? `Outage start: ${state.outageStartTime}` : null,
    state.batteryQuantity ? `Batteries mentioned: ${state.batteryQuantity}; calculator uses stated total bank voltage/Ah or kWh without guessing series/parallel wiring.` : null,
    state.inverterRatingVA && !state.inverterRatingWatts ? `Inverter rating provided as ${state.inverterRatingVA} VA; watt-based headroom is not estimated.` : null,
    state.surgeWatts ? `User-stated inverter surge rating: ${state.surgeWatts} W.` : null,
    state.priorities.length ? `Household priorities: ${state.priorities.join('; ')}` : null,
    state.appliances.some(item => item.category || item.priority) ? `Appliance categories and priorities: ${state.appliances.map(item => `${item.name}: ${item.category || 'category unknown'}, ${item.priority || 'priority not stated'}`).join('; ')}.` : null,
    state.appliances.filter(item => item.excluded).length ? `Excluded from watt/runtime estimates because wattage is unknown: ${state.appliances.filter(item => item.excluded).map(item => item.name).join(', ')}.` : null,
  ].filter(Boolean)
  return {
    backupType: state.backupType || 'none',
    hasBattery: state.backupType === 'inverter' || state.backupType === 'solar',
    batteryChemistry: state.batteryChemistry || 'unknown',
    voltage: state.voltage || 0,
    ampHours: state.ampHours || 0,
    directKwh: state.capacityKwh,
    isCapacityUnknown: state.batterySpecsUnknown || state.batterySpecsConflict || state.backupType === 'generator',
    inverterRatingWatts: state.inverterRatingWatts,
    inverterRatingVA: state.inverterRatingVA,
    inverterSurgeWatts: state.surgeWatts,
    typicalOutageHours: state.outageHours || 1,
    selectedAppliances,
    priorityMode: state.priorityMode || 'balanced',
    notes: notes.join(' '),
  }
}
