import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Pencil, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { AI_ADVISOR_LIMITS, type AdvisorConfirmedDraft, type AdvisorInputProposal, type AdvisorLocale, type AdvisorRequestV1, type AdvisorTurn } from '@/lib/ai-advisor-contract'
import { AdvisorClientError, requestAdvisorIntake } from '@/lib/advisor-client'
import { PRESET_APPLIANCES } from '@/lib/appliances-data'
import type { SetupInputs } from '@/lib/calculations'

interface Props {
  onContinue: (inputs: SetupInputs, locale: AdvisorLocale) => void
  onManual: () => void
}

const fieldNames: Record<string, string> = {
  backupType: 'Backup type', hasBattery: 'Battery present', batteryChemistry: 'Battery chemistry',
  voltage: 'Battery voltage', ampHours: 'Battery amp-hours', directKwh: 'Battery capacity',
  isCapacityUnknown: 'Capacity unknown', inverterRatingWatts: 'Inverter rating',
  inverterRatingVA: 'Inverter VA rating', inverterSurgeWatts: 'Inverter surge rating',
  solarPanelCount: 'Solar panels', solarPanelWatts: 'Watts per solar panel',
  typicalOutageHours: 'Outage duration', priorityMode: 'Planning priority',
  selectedAppliances: 'Appliances',
}

function applianceName(id: string, customName?: string) {
  return customName || PRESET_APPLIANCES.find(item => item.id === id)?.name || 'Custom appliance'
}

function proposalText(proposal: AdvisorInputProposal) {
  if (proposal.kind === 'upsert_appliance') {
    const item = proposal.value
    return `${applianceName(item.applianceId, item.customName)} · ${item.quantity} × ${item.watts ?? item.customWatts ?? PRESET_APPLIANCES.find(preset => preset.id === item.applianceId)?.wattage ?? 'unknown'} W${item.operatingHours === undefined ? '' : ` · ${item.operatingHours} h`}`
  }
  const value = proposal.value
  if (value === null) return 'Unknown'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (proposal.field === 'directKwh') return `${value} kWh`
  if (proposal.field === 'voltage') return `${value} V`
  if (proposal.field === 'ampHours') return `${value} Ah`
  if (proposal.field === 'typicalOutageHours') return `${value} hours`
  if (['inverterRatingWatts', 'inverterSurgeWatts', 'solarPanelWatts'].includes(proposal.field)) return `${value} W`
  if (proposal.field === 'inverterRatingVA') return `${value} VA`
  return String(value).replace(/_/g, ' ')
}

function NumberField({ label, value, onChange, min, max, step = 'any' }: {
  label: string; value: number | null | undefined; onChange: (value: number | undefined) => void
  min?: number; max?: number; step?: number | 'any'
}) {
  return <label className="block text-xs font-semibold text-muted-foreground">
    <span className="mb-1.5 block">{label}</span>
    <input type="number" inputMode="decimal" min={min} max={max} step={step} value={value ?? ''}
      onChange={event => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
      placeholder="Unknown"
      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
  </label>
}

function optionalNumber(value: number | null | undefined, min: number, max: number, integer = false) {
  return value == null || (Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)))
}

function makeWizardInputs(draft: AdvisorConfirmedDraft): SetupInputs | null {
  const type = draft.backupType
  const duration = draft.typicalOutageHours
  const mode = draft.priorityMode
  const appliances = draft.selectedAppliances
  if (!type || !mode || typeof draft.hasBattery !== 'boolean' || typeof duration !== 'number' || !Number.isFinite(duration) || duration < 1 || duration > 24 || !appliances?.length) return null
  if (type === 'none' && draft.hasBattery) return null
  if (!optionalNumber(draft.inverterRatingWatts, 1, 100000) || !optionalNumber(draft.inverterRatingVA, 1, 100000) ||
    !optionalNumber(draft.inverterSurgeWatts, 1, 100000) || !optionalNumber(draft.solarPanelCount, 1, 10000, true) ||
    !optionalNumber(draft.solarPanelWatts, 1, 5000)) return null
  if (appliances.length > AI_ADVISOR_LIMITS.maxAppliances) return null
  const selectedAppliances = appliances.map(item => {
    const preset = PRESET_APPLIANCES.find(candidate => candidate.id === item.applianceId)
    const watts = item.watts ?? item.customWatts ?? preset?.wattage
    if (!Number.isFinite(watts) || watts === undefined || watts <= 0 || watts > 100000 ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000 ||
      item.operatingHours === undefined || !Number.isFinite(item.operatingHours) || item.operatingHours < 0 || item.operatingHours > duration ||
      typeof item.mustRun !== 'boolean' || !item.priority || (!preset && !item.customName?.trim())) return null
    return { ...item, watts, operatingHours: item.operatingHours, mustRun: item.mustRun, priority: item.priority }
  })
  if (selectedAppliances.some(item => item === null)) return null
  const directKwh = draft.directKwh ?? null
  const voltage = draft.voltage ?? 0
  const ampHours = draft.ampHours ?? 0
  if (voltage < 0 || voltage > 1000 || ampHours < 0 || ampHours > 100000 ||
    (directKwh !== null && (directKwh <= 0 || directKwh > 1000))) return null
  const hasCapacity = directKwh !== null || (voltage > 0 && ampHours > 0)
  return {
    backupType: type,
    hasBattery: draft.hasBattery,
    batteryChemistry: draft.batteryChemistry ?? 'unknown',
    voltage: draft.hasBattery ? voltage : 0,
    ampHours: draft.hasBattery ? ampHours : 0,
    directKwh: draft.hasBattery ? directKwh : null,
    isCapacityUnknown: !draft.hasBattery || !hasCapacity,
    inverterRatingWatts: draft.inverterRatingWatts ?? null,
    inverterRatingVA: draft.inverterRatingVA ?? null,
    inverterSurgeWatts: draft.inverterSurgeWatts ?? null,
    solarPanelCount: draft.solarPanelCount ?? null,
    solarPanelWatts: draft.solarPanelWatts ?? null,
    typicalOutageHours: duration,
    selectedAppliances: selectedAppliances as SetupInputs['selectedAppliances'],
    priorityMode: mode,
  }
}

export function AiAdvisorPage({ onContinue, onManual }: Props) {
  const [locale, setLocale] = useState<AdvisorLocale>('en')
  const [message, setMessage] = useState('')
  const [turns, setTurns] = useState<AdvisorTurn[]>([])
  const [confirmed, setConfirmed] = useState<AdvisorConfirmedDraft>({})
  const [proposals, setProposals] = useState<AdvisorInputProposal[]>([])
  const [question, setQuestion] = useState('')
  const [safetyNotes, setSafetyNotes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [retryable, setRetryable] = useState(false)
  const [pending, setPending] = useState<Extract<AdvisorRequestV1, { action: 'intake' }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customWatts, setCustomWatts] = useState('')
  const mounted = useRef(true)
  const requestSequence = useRef(0)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const setField = (field: keyof AdvisorConfirmedDraft, value: unknown) => {
    setConfirmed(previous => {
      const next = { ...previous } as Record<string, unknown>
      if (value === undefined || value === '') delete next[field]
      else next[field] = value
      return next as AdvisorConfirmedDraft
    })
  }

  const updateAppliance = (index: number, changes: Partial<NonNullable<AdvisorConfirmedDraft['selectedAppliances']>[number]>) => {
    setConfirmed(previous => ({ ...previous, selectedAppliances: (previous.selectedAppliances ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }))
  }

  const ask = async (request: Extract<AdvisorRequestV1, { action: 'intake' }>) => {
    const sequence = ++requestSequence.current
    setLoading(true); setError(''); setRetryable(false); setPending(request)
    try {
      const reply = await requestAdvisorIntake(request)
      if (!mounted.current || sequence !== requestSequence.current) return
      const nextQuestion = reply.missingQuestions[0]?.question ?? ''
      const assistantTurn = `${reply.assistantMessage}${nextQuestion ? `\n${nextQuestion}` : ''}`.slice(0, AI_ADVISOR_LIMITS.maxTurnCharacters)
      setTurns([...request.turns, { role: 'assistant', content: assistantTurn }])
      setQuestion(nextQuestion)
      // Facts explicitly stated by the user belong in the unsaved conversation draft.
      // Catalog-derived appliance defaults remain suggestions for the user to review.
      const statedFacts = reply.proposedChanges.filter(proposal => proposal.source === 'user_statement')
      for (const proposal of statedFacts) {
        if (proposal.kind === 'set_field') {
          setConfirmed(previous => ({ ...previous, [proposal.field]: proposal.value }))
        } else {
          setConfirmed(previous => ({
            ...previous,
            selectedAppliances: [...(previous.selectedAppliances ?? []).filter(item => item.applianceId !== proposal.value.applianceId), proposal.value],
          }))
        }
      }
      setProposals(reply.proposedChanges.filter(proposal => proposal.source !== 'user_statement'))
      setSafetyNotes(reply.safetyNotes)
      setPending(null)
    } catch (cause) {
      if (!mounted.current || sequence !== requestSequence.current) return
      setError(cause instanceof Error ? cause.message : 'The AI Advisor is unavailable. Use the manual calculator.')
      setRetryable(!(cause instanceof AdvisorClientError) || cause.retryable)
    } finally { if (mounted.current && sequence === requestSequence.current) setLoading(false) }
  }

  const send = (event: FormEvent) => {
    event.preventDefault()
    const content = message.trim()
    if (!content || loading || proposals.length) return
    if (content.length > AI_ADVISOR_LIMITS.maxTurnCharacters) { setError('Keep each message under 1,000 characters.'); return }
    const recentTurns = [...turns, { role: 'user', content } as AdvisorTurn].slice(-AI_ADVISOR_LIMITS.maxTurns)
    while (recentTurns.reduce((sum, turn) => sum + turn.content.length, 0) > AI_ADVISOR_LIMITS.maxConversationCharacters) recentTurns.shift()
    setMessage('')
    setTurns(recentTurns)
    void ask({ version: 1, action: 'intake', locale, turns: recentTurns, confirmedInputs: confirmed })
  }

  const accept = (index: number) => {
    const proposal = proposals[index]
    if (!proposal) return
    if (proposal.kind === 'set_field') setField(proposal.field, proposal.value)
    else setConfirmed(previous => ({
      ...previous,
      selectedAppliances: [...(previous.selectedAppliances ?? []).filter(item => item.applianceId !== proposal.value.applianceId), proposal.value],
    }))
    setProposals(previous => previous.filter((_, itemIndex) => itemIndex !== index))
  }

  const addCustomAppliance = (event: FormEvent) => {
    event.preventDefault()
    const watts = Number(customWatts)
    if (!customName.trim() || !Number.isFinite(watts) || watts <= 0 || watts > 100000) {
      setError('Enter a custom appliance name and wattage between 1 and 100,000 W.'); return
    }
    setConfirmed(previous => ({ ...previous, selectedAppliances: [...(previous.selectedAppliances ?? []), {
      applianceId: `custom-${crypto.randomUUID()}`, customName: customName.trim(), quantity: 1, watts,
    }] }))
    setCustomName(''); setCustomWatts(''); setError('')
  }

  const readyInputs = makeWizardInputs(confirmed)
  const missing = [
    !confirmed.backupType && 'backup type',
    confirmed.hasBattery === undefined && 'battery presence',
    !confirmed.typicalOutageHours && 'outage duration',
    !confirmed.priorityMode && 'planning priority',
    !confirmed.selectedAppliances?.length && 'at least one appliance',
  ].filter(Boolean).join(', ')

  return <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">PowerUp · Guided planning</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">AI Backup Advisor</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Describe your outage and equipment. Review each suggested detail before PowerUp uses it. Unknown specifications stay unknown.</p>
      </div>
      <button type="button" onClick={() => { if (Object.keys(confirmed).length) { setReviewing(true); document.getElementById('advisor-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } else onManual() }} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{Object.keys(confirmed).length ? 'Finish confirmed draft manually' : 'Use manual calculator'}</button>
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
      <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-primary" /> Conversation</div>
          <label className="text-xs font-semibold text-muted-foreground">Language{' '}
            <select aria-label="Advisor language" value={locale} onChange={event => setLocale(event.target.value as AdvisorLocale)} className="ml-1 rounded-lg border border-border bg-card px-2 py-1.5 text-foreground">
              <option value="en">English</option><option value="ur">Urdu</option>
            </select>
          </label>
        </div>
        <div aria-live="polite" className="flex min-h-60 max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-xl bg-surface p-3 sm:p-4">
          {turns.length === 0 && <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-border bg-card p-4 text-sm leading-relaxed">Tell me what you need to keep running, for how long, and what backup equipment you already have. You can say when a specification is unknown.</div>}
          {turns.map((turn, index) => <div key={index} className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${turn.role === 'user' ? 'self-end rounded-tr-sm bg-primary text-[#111116]' : 'self-start rounded-tl-sm border border-border bg-card'}`}>{turn.content}</div>)}
          {loading && <div role="status" className="self-start rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Advisor is reviewing your details…</div>}
        </div>
        {question && !loading && <p className="mt-3 text-xs text-muted-foreground">Current follow-up: <span className="font-medium text-foreground">{question}</span></p>}
        {safetyNotes.length > 0 && <ul className="mt-3 list-inside list-disc text-xs text-muted-foreground">{safetyNotes.map((note, index) => <li key={index}>{note}</li>)}</ul>}
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}{pending && retryable && <button type="button" onClick={() => void ask(pending)} disabled={loading} className="ml-3 font-bold underline disabled:opacity-50">Retry</button>}</div>}
        {proposals.length > 0 && <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Review suggestions</h2><button type="button" onClick={() => setProposals([])} className="text-xs text-muted-foreground underline">Dismiss all</button></div>
          {proposals.map((proposal, index) => <div key={`${proposal.kind}-${index}`} className="rounded-xl border border-primary/35 bg-primary/5 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{proposal.kind === 'set_field' ? fieldNames[proposal.field] : 'Appliance'} · Suggested</p>
            <p className="mt-1 text-sm font-semibold">{proposalText(proposal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{proposal.source === 'named_catalog_preset' ? 'Catalog preset' : 'From your message'}: “{proposal.evidence}”</p>
            <div className="mt-3 flex gap-2"><button type="button" onClick={() => accept(index)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-[#111116]"><Check className="h-3.5 w-3.5" /> Confirm</button><button type="button" onClick={() => setProposals(previous => previous.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold"><X className="h-3.5 w-3.5" /> Reject</button></div>
          </div>)}
          <p className="text-xs text-muted-foreground">Confirm or reject these before sending another message. Confirming a suggestion changes only this unsaved draft.</p>
        </div>}
        <form onSubmit={send} className="mt-5">
          <label htmlFor="advisor-message" className="mb-2 block text-xs font-bold">Your message</label>
          <textarea id="advisor-message" rows={3} maxLength={AI_ADVISOR_LIMITS.maxTurnCharacters} value={message} onChange={event => setMessage(event.target.value)} disabled={loading || proposals.length > 0} placeholder="For example: I need my router and two lights for four hours. I have a solar inverter, but I don't know the battery capacity." className="w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60" />
          <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{message.length}/{AI_ADVISOR_LIMITS.maxTurnCharacters} · No conversation is saved as a plan</span><button type="submit" disabled={!message.trim() || loading || proposals.length > 0} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-[#111116] disabled:opacity-50"><Send className="h-4 w-4" /> Send</button></div>
        </form>
      </div>

      <aside id="advisor-review" className="min-w-0 scroll-mt-20 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Unsaved draft</p><h2 className="mt-1 text-xl font-extrabold">Review your details</h2></div><Pencil className="h-5 w-5 text-primary" /></div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Only details you confirm or enter here are used. Review appliance preset wattages against your own labels.</p>
        <button type="button" onClick={() => setReviewing(value => !value)} className="mt-4 w-full rounded-xl border border-border px-3 py-2.5 text-left text-sm font-semibold hover:border-primary" aria-expanded={reviewing}>{reviewing ? 'Hide' : 'Open'} structured review</button>
        {reviewing && <div className="mt-4 space-y-4">
          <label className="block text-xs font-semibold text-muted-foreground">Backup type
            <select value={confirmed.backupType ?? ''} onChange={event => setField('backupType', event.target.value || undefined)} className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"><option value="">Not specified</option><option value="inverter">Inverter / UPS</option><option value="solar">Solar + battery</option><option value="generator">Generator</option><option value="none">No installed backup</option></select>
          </label>
          <div className="grid grid-cols-2 gap-3"><NumberField label="Outage duration (hours)" min={1} max={24} value={confirmed.typicalOutageHours} onChange={value => setField('typicalOutageHours', value)} /><label className="block text-xs font-semibold text-muted-foreground">Planning priority<select value={confirmed.priorityMode ?? ''} onChange={event => setField('priorityMode', event.target.value || undefined)} className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"><option value="">Not specified</option><option value="balanced">Balanced</option><option value="maximum_runtime">Maximum runtime</option><option value="critical_only">Critical loads only</option></select></label></div>
          <label className="block text-xs font-semibold text-muted-foreground">Battery present in this backup system?<select value={confirmed.hasBattery === undefined ? '' : confirmed.hasBattery ? 'yes' : 'no'} onChange={event => setField('hasBattery', event.target.value === '' ? undefined : event.target.value === 'yes')} className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <div className="border-t border-border pt-4"><h3 className="mb-2 text-sm font-bold">Battery and inverter</h3><p className="mb-3 text-xs text-muted-foreground">Leave unknown specifications blank. Runtime needs capacity and chemistry.</p>
            {confirmed.hasBattery === false && <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">Battery specifications below will be excluded while “No battery” is selected.</p>}
            <label className="block text-xs font-semibold text-muted-foreground">Battery chemistry<select value={confirmed.batteryChemistry ?? 'unknown'} onChange={event => setField('batteryChemistry', event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"><option value="unknown">Unknown</option><option value="lifepo4">LiFePO4</option><option value="lead_acid">Lead acid</option><option value="agm">AGM</option></select></label>
            <div className="mt-3 grid grid-cols-2 gap-3"><NumberField label="Total capacity (kWh)" min={0.001} max={1000} value={confirmed.directKwh} onChange={value => setField('directKwh', value)} /><NumberField label="Bank voltage (V)" min={1} max={1000} value={confirmed.voltage} onChange={value => setField('voltage', value)} /><NumberField label="Bank amp-hours (Ah)" min={1} max={100000} value={confirmed.ampHours} onChange={value => setField('ampHours', value)} /><NumberField label="Inverter continuous (W)" min={1} max={1000000} value={confirmed.inverterRatingWatts} onChange={value => setField('inverterRatingWatts', value)} /><NumberField label="Inverter rating (VA)" min={1} max={1000000} value={confirmed.inverterRatingVA} onChange={value => setField('inverterRatingVA', value)} /><NumberField label="Inverter surge (W)" min={1} max={1000000} value={confirmed.inverterSurgeWatts} onChange={value => setField('inverterSurgeWatts', value)} /></div>
          </div>
          {confirmed.backupType === 'solar' && <div className="grid grid-cols-2 gap-3 border-t border-border pt-4"><NumberField label="Solar panel count" min={1} max={10000} step={1} value={confirmed.solarPanelCount} onChange={value => setField('solarPanelCount', value)} /><NumberField label="Watts per panel" min={1} max={100000} value={confirmed.solarPanelWatts} onChange={value => setField('solarPanelWatts', value)} /></div>}
          <div className="border-t border-border pt-4"><h3 className="mb-3 text-sm font-bold">Appliances</h3>
            {(confirmed.selectedAppliances ?? []).length === 0 && <p className="mb-3 text-xs text-muted-foreground">No appliances confirmed yet. Describe them in chat or add one below.</p>}
            <div className="space-y-3">{(confirmed.selectedAppliances ?? []).map((item, index) => {
              const preset = PRESET_APPLIANCES.find(candidate => candidate.id === item.applianceId)
              return <div key={item.applianceId} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2"><span className="text-sm font-bold">{applianceName(item.applianceId, item.customName)}</span><button type="button" aria-label={`Remove ${applianceName(item.applianceId, item.customName)}`} onClick={() => setConfirmed(previous => ({ ...previous, selectedAppliances: (previous.selectedAppliances ?? []).filter((_, itemIndex) => itemIndex !== index) }))} className="text-muted-foreground hover:text-red-600"><X className="h-4 w-4" /></button></div>
                {preset && item.watts === undefined && <p className="mt-1 text-xs text-muted-foreground">Catalog preset: {preset.wattage} W. Verify against your appliance.</p>}
                <div className="mt-3 grid grid-cols-3 gap-2"><NumberField label="Quantity" min={1} max={1000} step={1} value={item.quantity} onChange={value => updateAppliance(index, { quantity: value ?? 0 })} /><NumberField label="Watts each" min={1} max={100000} value={item.watts ?? item.customWatts ?? preset?.wattage} onChange={value => updateAppliance(index, { watts: value })} /><NumberField label="Hours" min={0} max={24} value={item.operatingHours} onChange={value => updateAppliance(index, { operatingHours: value })} /></div>
                <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-muted-foreground">During outage<select value={item.mustRun === undefined ? '' : item.mustRun ? 'yes' : 'no'} onChange={event => updateAppliance(index, { mustRun: event.target.value === '' ? undefined : event.target.value === 'yes' })} className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground"><option value="">Choose</option><option value="yes">Must run</option><option value="no">Optional</option></select></label><label className="text-xs font-semibold text-muted-foreground">Priority<select value={item.priority ?? ''} onChange={event => updateAppliance(index, { priority: event.target.value ? event.target.value as NonNullable<typeof item.priority> : undefined })} className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground"><option value="">Choose</option><option value="critical">Critical</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label></div>
              </div>
            })}</div>
            <form onSubmit={addCustomAppliance} className="mt-3 grid grid-cols-[1fr_7rem] gap-2"><input aria-label="Custom appliance name" maxLength={100} value={customName} onChange={event => setCustomName(event.target.value)} placeholder="Custom appliance" className="min-w-0 rounded-lg border border-border bg-card px-2 py-2 text-xs" /><input aria-label="Custom appliance watts" type="number" min={1} max={100000} value={customWatts} onChange={event => setCustomWatts(event.target.value)} placeholder="Watts" className="min-w-0 rounded-lg border border-border bg-card px-2 py-2 text-xs" /><button type="submit" className="col-span-2 rounded-lg border border-primary/50 px-3 py-2 text-xs font-bold text-primary">Add custom appliance</button></form>
          </div>
        </div>}
        <div className="mt-5 border-t border-border pt-4"><p className="text-xs text-muted-foreground">{readyInputs ? 'Ready for final review in the calculator. No plan has been saved.' : `Complete the review before continuing${missing ? `: ${missing}` : '. Check each appliance’s quantity, wattage, hours, must-run status, and priority.'}`}</p>
          <button type="button" disabled={!readyInputs || loading || proposals.length > 0} onClick={() => readyInputs && onContinue(readyInputs, locale)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-[#111116] disabled:cursor-not-allowed disabled:opacity-50">Review in calculator <ArrowRight className="h-4 w-4" /></button>
          <button type="button" disabled={loading} onClick={() => { setTurns([]); setConfirmed({}); setProposals([]); setQuestion(''); setSafetyNotes([]); setError(''); setMessage(''); setPending(null); setReviewing(false) }} className="mt-3 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /> Start over</button>
        </div>
      </aside>
    </div>
  </section>
}
