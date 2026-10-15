import { supabase } from '@/lib/supabase'
import { AI_ADVISOR_CONTRACT_VERSION, AI_ADVISOR_LIMITS, type AdvisorErrorV1, type AdvisorLocale, type AdvisorRequestV1, type AdvisorResponseV1 } from '@/lib/ai-advisor-contract'
import { CALCULATION_ENGINE_VERSION, type CalculationResults, type SetupInputs } from '@/lib/calculations'

const fields = new Set([
  'backupType', 'hasBattery', 'batteryChemistry', 'voltage', 'ampHours', 'directKwh',
  'isCapacityUnknown', 'inverterRatingWatts', 'inverterRatingVA', 'inverterSurgeWatts',
  'solarPanelCount', 'solarPanelWatts', 'typicalOutageHours', 'priorityMode',
])

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Compare JSON data independent of object insertion order while preserving array order. */
export function advisorValuesEqual(left: unknown, right: unknown): boolean {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    return value
  }
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right))
}

function unsafeGeneratedText(value: string): boolean {
  return /\b(?:ignore (?:previous|all|system) instructions|(?:api[_ -]?key|secret|password)|wire|wiring|terminal|bypass|short.circuit|solder|connect.{0,40}battery|remove.{0,40}fuse|disable.{0,40}breaker)\b/i.test(value)
}

function validProposal(value: unknown): boolean {
  if (!record(value) || typeof value.evidence !== 'string' ||
    !['user_statement', 'named_catalog_preset'].includes(String(value.source))) return false
  if (value.kind === 'set_field') return typeof value.field === 'string' && fields.has(value.field) && 'value' in value
  if (value.kind === 'upsert_appliance') return record(value.value) &&
    typeof value.value.applianceId === 'string' && Number.isInteger(value.value.quantity)
  return false
}

function isIntakeResponse(value: unknown): value is Extract<AdvisorResponseV1, { action: 'intake' }> {
  if (!record(value)) return false
  const row = value
  return row.version === AI_ADVISOR_CONTRACT_VERSION && row.action === 'intake' &&
    typeof row.assistantMessage === 'string' && row.assistantMessage.length <= 1000 && !unsafeGeneratedText(row.assistantMessage) &&
    record(row.confirmedInputs) && Array.isArray(row.missingQuestions) &&
    row.missingQuestions.length <= 1 && row.missingQuestions.every((question: unknown) =>
      record(question) && typeof question.field === 'string' && typeof question.question === 'string' &&
      question.question.length <= 300 && !unsafeGeneratedText(question.question)) &&
    Array.isArray(row.proposedChanges) && row.proposedChanges.length <= 20 && row.proposedChanges.every(validProposal) &&
    Array.isArray(row.safetyNotes) && row.safetyNotes.length <= 3 &&
    row.safetyNotes.every((note: unknown) => typeof note === 'string' && note.length <= 240 && !unsafeGeneratedText(note)) &&
    JSON.stringify(row).length <= AI_ADVISOR_LIMITS.requestBytes * 2
}

export class AdvisorClientError extends Error {
  constructor(message: string, public retryable = true) { super(message) }
}

async function invokeAdvisor(request: AdvisorRequestV1): Promise<unknown> {
  if (!supabase) throw new AdvisorClientError('The AI Advisor needs a configured Supabase project. You can still use the manual calculator.', false)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AdvisorClientError('You appear to be offline. Reconnect or use the manual calculator.')

  let data: unknown
  let error: Error | null
  try {
    const result = await supabase.functions.invoke('ai-backup-advisor', { body: request })
    data = result.data
    error = result.error
  } catch {
    throw new AdvisorClientError('The AI Advisor could not be reached. Retry or use the manual calculator.')
  }
  if (error) {
    const context = 'context' in error ? error.context : null
    if (context instanceof Response) {
      try {
        const body = await context.json() as AdvisorErrorV1
        if (body?.version === AI_ADVISOR_CONTRACT_VERSION && body.error && typeof body.error.message === 'string') {
          throw new AdvisorClientError(body.error.message, body.error.retryable === true)
        }
      } catch (cause) {
        if (cause instanceof AdvisorClientError) throw cause
      }
    }
    throw new AdvisorClientError('The AI Advisor is unavailable. Retry or continue in the manual calculator.')
  }
  return data
}

/** The browser sends only a bounded draft. Provider credentials remain in the Edge Function. */
export async function requestAdvisorIntake(request: Extract<AdvisorRequestV1, { action: 'intake' }>): Promise<Extract<AdvisorResponseV1, { action: 'intake' }>> {
  const data = await invokeAdvisor(request)
  if (!isIntakeResponse(data)) throw new AdvisorClientError('The AI Advisor returned an invalid reply. Retry or use the manual calculator.')
  if (!advisorValuesEqual(data.confirmedInputs, request.confirmedInputs)) {
    throw new AdvisorClientError('The AI Advisor returned inconsistent confirmed details. Please retry.', false)
  }
  return data
}

const resultFields = new Set([
  'isCalculable', 'nominalCapacityWh', 'depthOfDischargeRatio', 'inverterEfficiencyRatio',
  'usableCapacityWh', 'totalConnectedLoadWatts', 'continuousLoadWatts', 'smartCycledLoadWatts',
  'estimatedEnergyWh', 'plannedEnergyWh', 'recommendedBatteryCapacityWh',
  'recommendedInverterWatts', 'averageLoadWatts', 'peakSurgeWatts', 'continuousRuntimeHours',
  'smartRuntimeHours', 'targetOutageHours', 'isSufficient', 'runtimeSurplusDeficitHours',
  'batteryPercentageAtOutageEnd', 'inverterLoadPercentage', 'surgeWarning',
])

function safeNarrative(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max &&
    !/\p{N}/u.test(value) && !unsafeGeneratedText(value)
}

function safeSafetyNote(value: unknown): value is string {
  // Older Edge Function deployments use this fixed precaution in their rules fallback.
  return safeNarrative(value, 240) || value === 'Do not change electrical wiring or battery connections based on this estimate.'
}

function isExplanationResponse(value: unknown): value is Extract<AdvisorResponseV1, { action: 'explain' }> {
  if (!record(value) || !record(value.confirmedInputs) || !record(value.calculatedResults) || !record(value.explanation)) return false
  const narrative = value.explanation
  return value.version === AI_ADVISOR_CONTRACT_VERSION && value.action === 'explain' &&
    value.engineVersion === CALCULATION_ENGINE_VERSION && ['ai', 'rules'].includes(String(value.explanationSource)) &&
    safeNarrative(narrative.summary, 800) &&
    Array.isArray(narrative.recommendations) && narrative.recommendations.length <= 4 &&
    narrative.recommendations.every((item: unknown) => record(item) && safeNarrative(item.text, 350) &&
      Array.isArray(item.groundedIn) && item.groundedIn.length >= 1 &&
      item.groundedIn.length <= 4 && item.groundedIn.every((field: unknown) => typeof field === 'string' && resultFields.has(field))) &&
    Array.isArray(narrative.missingSpecifications) && narrative.missingSpecifications.length <= 1 &&
    narrative.missingSpecifications.every((item: unknown) => typeof item === 'string' && item.length <= 500) &&
    Array.isArray(narrative.safetyNotes) && narrative.safetyNotes.length <= 3 &&
    narrative.safetyNotes.every((item: unknown) => safeSafetyNote(item))
}

/** Accept model prose only when the Edge Function echoes the same confirmed inputs and calculation. */
export async function requestAdvisorExplanation(inputs: SetupInputs, localResults: CalculationResults, locale: AdvisorLocale = 'en'): Promise<Extract<AdvisorResponseV1, { action: 'explain' }>> {
  const { notes: _excludedNotes, ...confirmedInputs } = inputs
  const data = await invokeAdvisor({ version: AI_ADVISOR_CONTRACT_VERSION, action: 'explain', locale, confirmedInputs })
  if (!isExplanationResponse(data)) throw new AdvisorClientError('The advisor returned an invalid explanation. PowerUp’s calculated results remain available.')
  if (!advisorValuesEqual(data.confirmedInputs, confirmedInputs) ||
      !advisorValuesEqual(data.calculatedResults, localResults)) {
    throw new AdvisorClientError('The advisor’s explanation did not match this plan. PowerUp is showing the local calculation and rule-based advice.', false)
  }
  const expectedMissing = localResults.missingDetailsReason ? [localResults.missingDetailsReason] : []
  if (!advisorValuesEqual(data.explanation.missingSpecifications, expectedMissing)) {
    throw new AdvisorClientError('The advisor returned unsupported missing details. PowerUp is showing rule-based advice.', false)
  }
  return data
}
