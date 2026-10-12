import { AI_ADVISOR_CONTRACT_VERSION, AI_ADVISOR_LIMITS } from '../../../../frontend/src/lib/ai-advisor-contract.ts'
import type {
  AdvisorConfirmedDraft, AdvisorErrorCode, AdvisorInputProposal,
  AdvisorRequestV1, AdvisorResponseV1, AdvisorSetupInputs,
} from '../../../../frontend/src/lib/ai-advisor-contract.ts'
import { calculateBackupPlan, CALCULATION_ENGINE_VERSION } from '../../../../frontend/src/lib/calculations.ts'
import type { CalculationResults } from '../../../../frontend/src/lib/calculations.ts'
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

function evidenceSupportsValue(field: string, value: unknown, evidence: string): boolean {
  if (typeof value !== 'number') return true
  const unit = numericEvidenceUnits[field]
  if (!unit) return true
  const literal = String(value).replace('.', '\\.')
  if (new RegExp(`(?:^|[^0-9.])${literal}\\s*-?\\s*(?:${unit})(?![a-z])`, 'i').test(evidence)) return true
  const word = Number.isInteger(value) ? smallNumberWords[value] : undefined
  return Boolean(word && new RegExp(`(?:^|[^a-z])${word}\\s*-?\\s*(?:${unit})(?![a-z])`, 'i').test(evidence))
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
          !evidenceSupportsValue(row.field, parsed, row.evidence)) {
        throw new AdvisorFailure('provider_invalid_output', 502, 'The advisor returned an unsupported field suggestion. Please try again.', true)
      }
      proposals.push({ kind: 'set_field', field: row.field, value: parsed, source: 'user_statement', evidence: row.evidence } as AdvisorInputProposal)
    } else {
      if (row.field !== 'selectedAppliances' || !boundedString(row.draftItemId, 80) || !applianceValid(parsed, false) ||
          !evidenceValid(row.evidence, row.source as string, request.turns, (parsed as RecordValue).applianceId as string)) {
        throw new AdvisorFailure('provider_invalid_output', 502, 'The advisor returned an invalid appliance suggestion. Please try again.', true)
      }
      proposals.push({ kind: 'upsert_appliance', draftItemId: row.draftItemId, value: parsed, source: row.source, evidence: row.evidence } as AdvisorInputProposal)
    }
  }
  return {
    version: AI_ADVISOR_CONTRACT_VERSION, action: 'intake', confirmedInputs: request.confirmedInputs,
    assistantMessage: raw.assistantMessage,
    missingQuestions: missingField === '' ? [] : [{ field: missingField as keyof AdvisorSetupInputs, question: raw.missingQuestionText }],
    proposedChanges: proposals, safetyNotes: raw.safetyNotes,
  }
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
      safetyNotes: ['Do not change electrical wiring or battery connections based on this estimate.'],
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
      dependencies.checkProviderConfiguration?.()
      const allowed = await dependencies.consumeQuota(identity)
      if (!allowed) throw new AdvisorFailure('rate_limited', 429, 'The advisor limit has been reached. Please try again later.', true)
      if (payload.action === 'intake') {
        const raw = await dependencies.callProvider(payload)
        return json(validateIntakeOutput(raw, payload))
      }
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
