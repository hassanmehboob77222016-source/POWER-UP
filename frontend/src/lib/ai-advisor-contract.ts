import { CALCULATION_ENGINE_VERSION, type CalculationResults, type SetupInputs } from './calculations.ts'

/** Wire contract shared by the future advisor UI and Edge Function. */
export const AI_ADVISOR_CONTRACT_VERSION = 1 as const

/** Policy limits; enforcement belongs in the Edge Function, never the browser. */
export const AI_ADVISOR_LIMITS = {
  requestBytes: 20 * 1024,
  maxTurns: 8,
  maxTurnCharacters: 1000,
  maxConversationCharacters: 5000,
  maxAppliances: 30,
  providerTimeoutMs: 15_000,
  intakeOutputTokens: 1200,
  explanationOutputTokens: 600,
} as const

export type AdvisorLocale = 'en' | 'ur'
export type AdvisorTurn = { role: 'user' | 'assistant'; content: string }

// Free-form plan notes are intentionally excluded from provider requests.
export type AdvisorSetupInputs = Omit<SetupInputs, 'notes'>
export type AdvisorConfirmedDraft = Partial<AdvisorSetupInputs>
export type AdvisorAppliance = AdvisorSetupInputs['selectedAppliances'][number]

export type AdvisorRequestV1 =
  | {
      version: typeof AI_ADVISOR_CONTRACT_VERSION
      action: 'intake'
      locale: AdvisorLocale
      turns: AdvisorTurn[]
      confirmedInputs: AdvisorConfirmedDraft
    }
  | {
      version: typeof AI_ADVISOR_CONTRACT_VERSION
      action: 'explain'
      locale: AdvisorLocale
      confirmedInputs: AdvisorSetupInputs
    }

export type AdvisorProposalSource = 'user_statement' | 'named_catalog_preset'

type ProposableSetupField = Exclude<keyof AdvisorSetupInputs, 'selectedAppliances'>

export type AdvisorFieldProposal = {
  [K in ProposableSetupField]: {
    kind: 'set_field'
    field: K
    value: Exclude<AdvisorSetupInputs[K], undefined>
    source: AdvisorProposalSource
    evidence: string
  }
}[ProposableSetupField]

export type AdvisorApplianceProposal = {
  kind: 'upsert_appliance'
  draftItemId: string
  value: AdvisorAppliance
  source: AdvisorProposalSource
  evidence: string
}

/** Suggestions remain separate from confirmed inputs until the user accepts them. */
export type AdvisorInputProposal = AdvisorFieldProposal | AdvisorApplianceProposal

export type AdvisorMissingQuestion = {
  field: ProposableSetupField | 'selectedAppliances'
  question: string
}

export type AdvisorResponseV1 =
  | {
      version: typeof AI_ADVISOR_CONTRACT_VERSION
      action: 'intake'
      confirmedInputs: AdvisorConfirmedDraft
      assistantMessage: string
      missingQuestions: AdvisorMissingQuestion[]
      proposedChanges: AdvisorInputProposal[]
      safetyNotes: string[]
    }
  | {
      version: typeof AI_ADVISOR_CONTRACT_VERSION
      action: 'explain'
      confirmedInputs: AdvisorSetupInputs
      engineVersion: typeof CALCULATION_ENGINE_VERSION
      calculatedResults: CalculationResults
      explanationSource: 'ai' | 'rules'
      explanation: {
        summary: string
        recommendations: { text: string; groundedIn: (keyof CalculationResults)[] }[]
        missingSpecifications: string[]
        safetyNotes: string[]
      }
    }

export type AdvisorErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'payload_too_large'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'provider_invalid_output'
  | 'not_configured'

export type AdvisorErrorV1 = {
  version: typeof AI_ADVISOR_CONTRACT_VERSION
  error: { code: AdvisorErrorCode; message: string; retryable: boolean }
}
