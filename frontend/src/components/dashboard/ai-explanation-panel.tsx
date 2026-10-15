import { LoaderCircle, RotateCcw, Sparkles } from 'lucide-react'
import type { AdvisorResponseV1 } from '@/lib/ai-advisor-contract'
import type { CalculationResults } from '@/lib/calculations'
import { formatHoursMinutes } from '@/lib/duration'

type Explanation = Extract<AdvisorResponseV1, { action: 'explain' }>

interface Props {
  results: CalculationResults
  explanation: Explanation | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string
  onRequest: () => void
  context?: 'results' | 'monitoring'
}

const labels: Partial<Record<keyof CalculationResults, string>> = {
  isCalculable: 'Runtime calculable', nominalCapacityWh: 'Nominal battery capacity',
  depthOfDischargeRatio: 'Assumed discharge limit', inverterEfficiencyRatio: 'Assumed inverter efficiency',
  usableCapacityWh: 'Usable battery capacity', totalConnectedLoadWatts: 'Connected load',
  continuousLoadWatts: 'Continuous load', smartCycledLoadWatts: 'Scheduled load',
  estimatedEnergyWh: 'Estimated energy use', plannedEnergyWh: 'Planned energy',
  recommendedBatteryCapacityWh: 'Battery sizing estimate', recommendedInverterWatts: 'Inverter sizing estimate',
  averageLoadWatts: 'Average planned load', peakSurgeWatts: 'Starting load',
  continuousRuntimeHours: 'Continuous runtime estimate', smartRuntimeHours: 'Scheduled runtime estimate',
  targetOutageHours: 'Target outage', isSufficient: 'Estimated coverage',
  runtimeSurplusDeficitHours: 'Runtime margin', batteryPercentageAtOutageEnd: 'Estimated end reserve',
  inverterLoadPercentage: 'Inverter load', surgeWarning: 'Surge warning',
}

function groundedValue(field: keyof CalculationResults, results: CalculationResults) {
  const value = results[field]
  if (value == null) return 'Not available'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value !== 'number') return 'Not available'
  if (field.endsWith('Ratio')) return `${Math.round(value * 100)}% assumed`
  if (field.endsWith('Percentage')) return `${value}% estimated`
  if (field.endsWith('Hours')) return `${formatHoursMinutes(value)} estimated`
  if (field.endsWith('Wh')) return `${value.toLocaleString()} Wh`
  if (field.endsWith('Watts')) return `${value.toLocaleString()} W`
  return String(value)
}

export function AiExplanationPanel({ results, explanation, status, error, onRequest, context = 'results' }: Props) {
  const narrative = explanation?.explanation
  return <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm sm:p-6" aria-label="AI plan explanation">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary"><Sparkles className="h-5 w-5" /></span>
        <div><h2 className="text-lg font-extrabold">Plan explanation</h2><p className="mt-1 text-xs text-muted-foreground">PowerUp calculates the plan estimates from {context === 'monitoring' ? 'your saved specifications' : 'your confirmed inputs'}. Explanation text cannot change them.</p></div>
      </div>
      <button type="button" onClick={onRequest} disabled={status === 'loading'} className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold hover:bg-primary/20 disabled:opacity-60">
        {status === 'loading' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : status === 'idle' ? <Sparkles className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
        {status === 'loading' ? 'Explaining…' : status === 'idle' ? 'Explain with AI' : 'Refresh explanation'}
      </button>
    </div>
    {status === 'idle' && <p className="mt-4 text-sm text-muted-foreground">Choose “Explain with AI” for a grounded explanation. {context === 'monitoring' ? 'This explains the saved plan only. Manual readings are not sent or diagnosed.' : 'The rule-based recommendations and calculations below are available now.'}</p>}
    {status === 'loading' && <p role="status" className="mt-4 text-sm text-muted-foreground">Requesting an explanation of this calculated plan…</p>}
    {status === 'error' && <p role="status" className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800">{error} {context === 'monitoring' ? 'The saved configuration and manual readings remain available.' : 'The calculated values and rule-based recommendations below are still available.'}</p>}
    {status === 'ready' && narrative && <div className="mt-5 space-y-4">
      <p className="inline-flex rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{explanation.explanationSource === 'ai' ? 'AI explanation' : 'Rule-based fallback'}</p>
      <p className="text-sm leading-relaxed text-foreground">{narrative.summary}</p>
      {narrative.recommendations.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{narrative.recommendations.map((recommendation, index) => <div key={index} className="rounded-xl border border-border bg-surface p-3.5"><p className="text-sm leading-relaxed">{recommendation.text}</p><div className="mt-3 flex flex-wrap gap-1.5">{recommendation.groundedIn.map(field => <span key={field} className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">{labels[field] ?? field}: <strong className="text-foreground">{groundedValue(field, results)}</strong></span>)}</div></div>)}</div>}
      {narrative.missingSpecifications.length > 0 && <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800"><strong>Missing specifications</strong><ul className="mt-1 list-inside list-disc">{narrative.missingSpecifications.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
      {narrative.safetyNotes.length > 0 && <ul className="list-inside list-disc text-xs text-muted-foreground">{narrative.safetyNotes.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      <p className="text-xs text-muted-foreground">Runtime and sizing remain planning estimates, never guarantees. Check equipment labels and manufacturer guidance.</p>
    </div>}
  </section>
}
