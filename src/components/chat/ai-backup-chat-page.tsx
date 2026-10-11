import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, BatteryCharging, Check, Clock3, LoaderCircle, MessageCircle, Send, Shield, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'
import { PRESET_APPLIANCES } from '@/lib/appliances-data'
import { calculateBackupPlan, type CalculationResults, type SetupInputs } from '@/lib/calculations'
import { generateAICoachAdvice, type AICoachPlan } from '@/lib/ai-service'
import { createEmptyBackupChatState, nextRequiredQuestion, sanitizeBackupChatResponse, toSetupInputs, type BackupChatMessage, type BackupChatState } from '@/lib/backup-chat'
import { buildBackupUpgradeScenarios, type BackupUpgradeScenario } from '@/lib/backup-upgrade-advisor'

interface ChatPlan { inputs: SetupInputs; results: CalculationResults; advice: AICoachPlan; explanation: string }
interface Props {
  onSignIn: () => void
  onPlanReady: (inputs: SetupInputs, results: CalculationResults, advice: AICoachPlan) => void
  onOpenDetailedPlan: () => void
}

const initialMessages: BackupChatMessage[] = [{
  role: 'assistant',
  content: 'Hi! I can help you plan your home backup. Tell me about your load-shedding, battery, inverter, and the appliances you want to run. You can describe everything normally; you do not need to fill out a form.',
}]
const examples = [
  'Roz 4 ghante light band hoti hai. 24V 150Ah LiFePO₄ battery, 1500W inverter, 4 fans aur fridge.',
  'I have an inverter but I do not know the battery specs. I need lights, Wi-Fi, and one fan for a 3-hour outage.',
]

function getFunctionError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    return error.context.clone().json().then((data: { error?: string }) => data.error || fallback).catch(() => fallback)
  }
  return Promise.resolve(error instanceof Error ? error.message : fallback)
}

function summarizeFacts(state: BackupChatState) {
  const backupNames = { inverter: 'Inverter / UPS', solar: 'Solar + battery', generator: 'Generator', none: 'No installed backup' }
  const batteryNames = { lifepo4: 'LiFePO₄', lead_acid: 'Lead-acid', agm: 'AGM / GEL', unknown: 'Chemistry unknown' }
  return [
    state.backupType ? { label: 'Setup', value: backupNames[state.backupType] } : null,
    state.outageHours ? { label: 'Outage', value: `${state.outageHours} hours${state.outageFrequency ? ` · ${state.outageFrequency}` : ''}` } : null,
    state.batterySpecsConflict ? { label: 'Battery bank', value: 'Conflicting figures · confirmation needed' } : state.capacityKwh ? { label: 'Battery bank', value: `${state.capacityKwh} kWh${state.batteryQuantity ? ` · ${state.batteryQuantity} units` : ''}` } : state.voltage && state.ampHours ? { label: 'Battery bank', value: `${state.voltage}V · ${state.ampHours}Ah${state.batteryChemistry ? ` · ${batteryNames[state.batteryChemistry]}` : ''}` } : state.batterySpecsUnknown ? { label: 'Battery bank', value: 'Specs unknown · runtime will not be estimated' } : null,
    state.inverterRatingWatts ? { label: 'Inverter', value: `${state.inverterRatingWatts}W continuous` } : state.inverterRatingVA ? { label: 'Inverter', value: `${state.inverterRatingVA}VA · watt headroom unavailable` } : state.inverterRatingUnknown ? { label: 'Inverter', value: 'Rating unknown · headroom unchecked' } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item))
}

export function AIBackupChatPage({ onSignIn, onPlanReady, onOpenDetailedPlan }: Props) {
  const { user, configured, configurationError } = useAuth()
  const [state, setState] = useState<BackupChatState>(createEmptyBackupChatState)
  const [messages, setMessages] = useState<BackupChatMessage[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [buildingPlan, setBuildingPlan] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<ChatPlan | null>(null)
  const [upgradeComparison, setUpgradeComparison] = useState<{ scenarios: BackupUpgradeScenario[]; unavailableReason: string | null } | null>(null)
  const conversationEnd = useRef<HTMLDivElement>(null)
  const userMessages = useMemo(() => messages.filter(message => message.role === 'user'), [messages])
  const nextQuestion = nextRequiredQuestion(state)
  const facts = summarizeFacts(state)
  const planNeedsUpgrade = Boolean(plan && (!plan.results.isCalculable || !plan.results.isSufficient || (plan.inputs.inverterRatingWatts !== null && plan.results.continuousLoadWatts > plan.inputs.inverterRatingWatts) || plan.results.surgeWarning === true))
  const planNeedsReview = Boolean(planNeedsUpgrade || (plan?.results.isCalculable && (plan.inputs.inverterRatingWatts === null || plan.results.surgeWarning === null)))
  const planStatus = !plan?.results.isCalculable
    ? 'Runtime cannot be estimated from the confirmed specifications.'
    : !plan.results.isSufficient
      ? `Runtime estimate falls short of the ${plan.results.targetOutageHours}-hour target.`
      : plan.inputs.inverterRatingWatts !== null && plan.results.continuousLoadWatts > plan.inputs.inverterRatingWatts
        ? 'Battery runtime estimate covers the target, but calculated load exceeds the inverter continuous rating.'
        : plan.results.surgeWarning === true
          ? 'Battery runtime estimate covers the target, but the inverter surge check raises a warning.'
          : plan.inputs.inverterRatingWatts === null || plan.results.surgeWarning === null
            ? 'Battery runtime estimate covers the target; inverter compatibility is not fully checked.'
            : 'The estimate meets the target with the stated inverter checks. Actual runtime varies with operating conditions.'
  const catalogForModel = useMemo(() => PRESET_APPLIANCES.map(({ id, name, wattage, category, unitLabel, unitCount }) => ({ id, name, wattage, category, unitLabel: unitLabel || null, unitCount: unitCount || 1 })), [])

  useEffect(() => { conversationEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, loading, plan])

  const sendMessage = async (event?: React.FormEvent, suppliedText?: string) => {
    event?.preventDefault()
    const text = (suppliedText ?? draft).trim()
    if (!text || loading) return
    if (!supabase) { setError('AI chat needs the configured PowerUp service. Your message has not been sent.'); return }
    const fullHistory: BackupChatMessage[] = [...messages, { role: 'user', content: text }]
    const nextMessages = fullHistory.slice(-8)
    setMessages(current => [...current, { role: 'user', content: text }])
    setDraft(''); setError(''); setLoading(true); setPlan(null); setUpgradeComparison(null)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-backup-advisor', {
        body: { action: 'chat', state, messages: nextMessages, catalog: catalogForModel },
      })
      if (invokeError) throw new Error(await getFunctionError(invokeError, invokeError.message || 'The AI could not reply.'))
      const reply = sanitizeBackupChatResponse(data, PRESET_APPLIANCES, fullHistory)
      if (!reply) throw new Error('The AI reply was incomplete. Please try your message again.')
      setState(reply.state)
      const required = nextRequiredQuestion(reply.state)
      const systemQuestion = required && reply.questionField !== required.field ? `\n\n${required.question}` : ''
      setMessages(current => [...current, { role: 'assistant', content: `${reply.assistantMessage}${systemQuestion}` }])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The AI could not reply. Please try again.')
    } finally { setLoading(false) }
  }

  const markUnknown = (field: 'battery' | 'inverter') => {
    setError('')
    setState(current => field === 'battery'
      ? { ...current, batterySpecsUnknown: true, batteryChemistry: current.batteryChemistry || 'unknown' }
      : { ...current, inverterRatingUnknown: true })
    const reply = field === 'battery'
      ? 'That is fine. I will leave battery runtime blank instead of guessing. We can still organize the loads you have listed.'
      : 'No problem. I will show the inverter load but leave headroom and surge checks unverified.'
    setMessages(current => [...current, { role: 'assistant', content: reply }])
  }

  const markChemistryUnknown = () => {
    setState(current => ({ ...current, batteryChemistry: 'unknown', batterySpecsUnknown: false }))
    setMessages(current => [...current, { role: 'assistant', content: 'I will keep the known battery capacity and use PowerUp’s default 60% depth-of-discharge assumption for unknown chemistry. The plan will label that assumption.' }])
  }

  const excludeUnknownAppliances = () => {
    const excluded = state.appliances.map(item => item.catalogId || item.wattage ? item : { ...item, excluded: true })
    setState(current => ({ ...current, appliances: excluded }))
    setMessages(current => [...current, { role: 'assistant', content: 'I will leave those unpriced items out of the numeric estimate and call them out in the plan.' }])
  }

  const buildPlan = async () => {
    if (nextQuestion || buildingPlan) return
    setBuildingPlan(true); setError('')
    const inputs = toSetupInputs(state, PRESET_APPLIANCES)
    try {
      const results = calculateBackupPlan(inputs, PRESET_APPLIANCES)
      const advice = await generateAICoachAdvice(inputs, results)
      setUpgradeComparison(null)
      onPlanReady(inputs, results, advice)
      let explanation = advice.verdictDescription
      try {
        if (!supabase) throw new Error('AI service is not configured.')
        const { data, error: invokeError } = await supabase.functions.invoke('ai-backup-advisor', {
          body: { action: 'explain', language: userMessages.slice(-3).map(message => message.content).join(' ').slice(0, 3600), state, calculation: results, ruleAdvice: advice },
        })
        if (invokeError) throw new Error(await getFunctionError(invokeError, invokeError.message || 'Could not request an AI explanation.'))
        if (typeof data?.assistantMessage !== 'string' || !data.assistantMessage.trim()) throw new Error('The AI explanation was empty.')
        explanation = data.assistantMessage.trim()
      } catch (explanationError) {
        setError(explanationError instanceof Error ? `The plan is ready, but its conversational explanation is unavailable: ${explanationError.message}` : 'The plan is ready, but the AI explanation is unavailable.')
      }
      setPlan({ inputs, results, advice, explanation })
      setMessages(current => [...current, { role: 'assistant', content: `Your PowerUp plan is ready. ${explanation}` }])
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : 'PowerUp could not build a plan from these details.')
    } finally { setBuildingPlan(false) }
  }

  const exploreUpgrades = () => {
    if (!plan) return
    setUpgradeComparison(buildBackupUpgradeScenarios(state, plan.inputs, PRESET_APPLIANCES))
  }

  const useScenario = async (candidate: BackupUpgradeScenario) => {
    if (!candidate.results.isCalculable) return
    setBuildingPlan(true); setError('')
    try {
      const advice = await generateAICoachAdvice(candidate.inputs, candidate.results)
      onPlanReady(candidate.inputs, candidate.results, advice)
      const explanation = `${candidate.title} selected. ${advice.verdictDescription}`
      setPlan({ inputs: candidate.inputs, results: candidate.results, advice, explanation })
      setMessages(current => [...current, { role: 'assistant', content: explanation }])
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : 'Could not prepare this configuration.')
    } finally { setBuildingPlan(false) }
  }

  const unknownAppliances = state.appliances.filter(item => !item.excluded && !item.catalogId && !item.wattage)

  return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#B88628]"><Sparkles className="h-4 w-4" /> PowerUp Conversation</p><h1 className="text-3xl font-extrabold sm:text-4xl">AI Backup Advisor</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Describe your outages and the appliances that matter. I’ll gather the few details needed and use the same PowerUp calculator as the setup wizard.</p></div>
      <div className="flex items-center gap-2 rounded-full border border-[#D99B26]/30 bg-[#FAF6EE] px-3 py-2 text-xs font-semibold text-[#775313]"><Shield className="h-4 w-4" /> No PowerUp chat history</div>
    </div>

    {!configured && <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{configurationError || 'Configure Supabase to use the AI advisor.'}</div>}

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-[#FAF6EE] px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E5A93C] text-black"><MessageCircle className="h-5 w-5" /></div><div><h2 className="text-sm font-bold">Your backup conversation</h2><p className="text-xs text-muted-foreground">Answers can be in English, Urdu, or both</p></div></div><span className="rounded-full border border-[#D99B26]/30 bg-white px-2.5 py-1 text-[11px] font-bold text-[#8C641A]">PowerUp engine</span></div>

        <div className="max-h-[min(60dvh,640px)] min-h-[360px] space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-label="Conversation">
          {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[82%] ${message.role === 'user' ? 'rounded-br-md bg-[#8C641A] text-white' : 'rounded-bl-md border border-border bg-[#FAF8F3] text-foreground'}`}>{message.content}</div>
          </div>)}
          {loading && <div className="flex justify-start"><div role="status" className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-[#FAF8F3] px-4 py-3 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Understanding your setup…</div></div>}
          {plan && <div className="rounded-2xl border border-[#D99B26]/40 bg-[#FFFCF5] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><Check className="h-5 w-5 text-emerald-700" /><h3 className="font-bold">Your calculated backup plan</h3></div>
            <p role="status" className={`mb-3 rounded-xl p-3 text-xs font-semibold leading-relaxed ${planNeedsReview ? 'bg-amber-50 text-amber-950' : 'bg-emerald-50 text-emerald-900'}`}>{planStatus}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Target outage" value={`${plan.results.targetOutageHours}h`} icon={<Clock3 className="h-4 w-4" />} />
              <Metric label="Estimated runtime" value={plan.results.isCalculable ? `${plan.results.smartRuntimeHours}h` : 'Not available'} icon={<BatteryCharging className="h-4 w-4" />} />
              <Metric label="Known load" value={plan.results.isCalculable ? `${plan.results.smartCycledLoadWatts}W` : 'Not calculated'} icon={<Zap className="h-4 w-4" />} />
            </div>
            {!plan.results.isCalculable && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">{plan.results.missingDetailsReason}</p>}
            {plan.inputs.inverterRatingWatts === null && plan.inputs.backupType !== 'none' && <p className="mt-2 text-xs text-muted-foreground">Watt-based inverter headroom is not checked because its continuous watt rating was not provided.</p>}
            {state.appliances.some(item => item.excluded) && <p className="mt-2 text-xs text-muted-foreground">Excluded from numeric load: {state.appliances.filter(item => item.excluded).map(item => item.name).join(', ')}.</p>}
            <button onClick={onOpenDetailedPlan} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E5A93C] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#C99E3B]">Open detailed PowerUp plan <ArrowRight className="h-4 w-4" /></button>
            {planNeedsUpgrade && <button onClick={exploreUpgrades} className="mt-3 ml-0 inline-flex items-center gap-2 rounded-xl border border-[#D99B26]/50 bg-white px-4 py-2.5 text-sm font-bold text-[#775313] transition hover:bg-[#FAF6EE] sm:ml-3">Explore backup upgrades <ArrowRight className="h-4 w-4" /></button>}
          </div>}
          {upgradeComparison && <section aria-label="Backup upgrade comparison" className="space-y-3 rounded-2xl border border-border bg-white p-4 sm:p-5">
            <div><h3 className="font-bold">Backup scenario comparison</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">All runtime and load values below come from the PowerUp calculator. They are estimates based on the stated specifications and operating assumptions.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {upgradeComparison.scenarios.map(candidate => <article key={candidate.id} className="rounded-xl border border-[#D99B26]/30 bg-[#FFFCF5] p-4">
                <div className="flex items-start justify-between gap-2"><h4 className="text-sm font-bold">{candidate.title}</h4><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${candidate.meetsTarget ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{candidate.meetsTarget ? 'Target met · checks available' : !candidate.results.isCalculable ? 'Not calculable' : candidate.results.isSufficient && (candidate.inverterOverloaded === null || candidate.results.surgeWarning === null) ? 'Conditional · check missing' : 'Target or limit not met'}</span></div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{candidate.description}</p>
                {candidate.results.isCalculable ? <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <ComparisonValue label="Nominal bank" value={`${(candidate.results.nominalCapacityWh / 1000).toFixed(2)} kWh`} />
                  <ComparisonValue label="Estimated usable" value={`${(candidate.results.usableCapacityWh / 1000).toFixed(2)} kWh`} />
                  <ComparisonValue label="Estimated runtime" value={`${candidate.results.smartRuntimeHours} h`} />
                  <ComparisonValue label="Target outage" value={`${candidate.results.targetOutageHours} h`} />
                  <ComparisonValue label="Calculated load" value={`${candidate.results.continuousLoadWatts} W`} />
                  <ComparisonValue label="Inverter" value={candidate.inverterOverloaded === null ? 'Not verified' : candidate.inverterOverloaded ? 'Continuous overload' : `${candidate.inputs.inverterRatingWatts} W · within continuous rating`} />
                  <ComparisonValue label="Starting load" value={candidate.results.surgeWarning === null ? 'Not verified' : candidate.results.surgeWarning ? 'Surge warning' : 'Within checked limit'} />
                </dl> : <p className="mt-3 text-xs text-amber-900">{candidate.results.missingDetailsReason}</p>}
                {candidate.notes.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-muted-foreground">{candidate.notes.map(note => <li key={note}>{note}</li>)}</ul>}
                {candidate.id !== 'current' && candidate.results.isCalculable && <button onClick={() => void useScenario(candidate)} disabled={buildingPlan || !candidate.meetsTarget} className="mt-4 w-full rounded-lg bg-[#E5A93C] px-3 py-2 text-xs font-bold text-black transition hover:bg-[#C99E3B] disabled:cursor-not-allowed disabled:opacity-50">{buildingPlan ? 'Preparing…' : 'Use this configuration'}</button>}
              </article>)}
            </div>
            {upgradeComparison.unavailableReason && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">{upgradeComparison.unavailableReason}</p>}
            <p className="text-[11px] leading-relaxed text-muted-foreground">Capacity upgrades are illustrative total-bank scenarios, not product or wiring recommendations. Verify inverter and charger voltage, battery chemistry, series/parallel limits, wiring, protection, surge capability, and manufacturer guidance before changing hardware. No prices or hardware compatibility are assumed.</p>
          </section>}
          <div ref={conversationEnd} />
        </div>

        {error && <div role="alert" className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-6"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
        {!configured ? <div className="border-t border-border bg-[#FFFCF5] p-4 sm:p-5"><p className="text-sm font-semibold">AI service configuration is required</p><p className="mt-1 text-xs text-muted-foreground">{configurationError || 'Configure the Supabase project and deploy the AI advisor function. You can still use the calculator without an account.'}</p></div> : <form onSubmit={sendMessage} className="border-t border-border bg-[#FFFCF5] p-3 sm:p-4">
          {!user && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D99B26]/25 bg-white p-3"><p className="text-xs leading-relaxed text-muted-foreground">Guest chat is available without an account. The conversation stays in this page session; it is not saved by PowerUp. Public requests have a per-network rate limit.</p><button type="button" onClick={onSignIn} className="shrink-0 text-xs font-bold text-[#8C641A] underline underline-offset-2">Login / Sign Up</button></div>}
          {userMessages.length === 0 && <div className="mb-3 flex flex-wrap gap-2">{examples.map((example, index) => <button key={example} type="button" disabled={loading} onClick={() => void sendMessage(undefined, example)} className="rounded-full border border-[#D99B26]/35 bg-white px-3 py-1.5 text-left text-xs text-[#775313] transition hover:bg-[#FAF6EE] disabled:opacity-50">{index === 0 ? 'Hinglish setup example' : 'Unknown battery example'}</button>)}</div>}
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-white p-2 focus-within:border-[#D99B26] focus-within:ring-2 focus-within:ring-[#D99B26]/20"><label className="sr-only" htmlFor="backup-chat-input">Describe your backup power situation</label><textarea id="backup-chat-input" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} maxLength={1200} rows={2} placeholder="Tell me what your home needs during an outage…" className="max-h-36 min-h-12 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground" /> <button type="submit" disabled={loading || !draft.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5A93C] text-black transition hover:bg-[#C99E3B] disabled:cursor-not-allowed disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line · Do not share account passwords or sensitive personal information.</p>
        </form>}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">What I understand</h2><span className="text-[11px] text-muted-foreground">Updates as we chat</span></div>
          {facts.length ? <dl className="space-y-3">{facts.map(item => <div key={item.label}><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</dt><dd className="mt-0.5 text-sm font-semibold">{item.value}</dd></div>)}</dl> : <p className="text-sm text-muted-foreground">Your setup will appear here as you describe it.</p>}
          {state.appliances.length > 0 && <div className="mt-4 border-t border-border pt-3"><h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Appliances</h3><ul className="space-y-2">{state.appliances.map((item, index) => { const preset = PRESET_APPLIANCES.find(candidate => candidate.id === item.catalogId); const watts = item.wattage || (preset ? preset.wattage / (preset.unitCount || 1) : null); return <li key={`${item.name}-${index}`} className="flex justify-between gap-3 text-xs"><span>{item.quantity} × {item.name}{item.excluded && <span className="text-amber-700"> · excluded</span>}</span><span className="shrink-0 font-mono text-muted-foreground">{item.excluded ? '—' : watts ? `${watts}W each · ${item.wattage ? 'you stated' : 'PowerUp preset'}` : 'W needed'}</span></li> })}</ul></div>}
        </div>

        {nextQuestion && user && <div className="rounded-2xl border border-[#D99B26]/35 bg-[#FFFCF5] p-5"><p className="text-xs font-bold uppercase tracking-wide text-[#8C641A]">Next detail</p><p className="mt-2 text-sm leading-relaxed">{nextQuestion.question}</p>
          {nextQuestion.field === 'batterySpecs' && !state.batterySpecsConflict && (state.capacityKwh || (state.voltage && state.ampHours))
            ? <button onClick={markChemistryUnknown} className="mt-3 rounded-lg border border-[#D99B26]/40 bg-white px-3 py-2 text-xs font-semibold text-[#775313] hover:bg-[#FAF6EE]">I don’t know the chemistry; use unknown assumption</button>
            : nextQuestion.field === 'batterySpecs' && <button onClick={() => markUnknown('battery')} className="mt-3 rounded-lg border border-[#D99B26]/40 bg-white px-3 py-2 text-xs font-semibold text-[#775313] hover:bg-[#FAF6EE]">I’m not sure; continue without runtime</button>}
          {nextQuestion.field === 'inverterRating' && <button onClick={() => markUnknown('inverter')} className="mt-3 rounded-lg border border-[#D99B26]/40 bg-white px-3 py-2 text-xs font-semibold text-[#775313] hover:bg-[#FAF6EE]">I don’t know the rating</button>}
          {nextQuestion.field === 'applianceWattage' && unknownAppliances.length > 0 && <button onClick={excludeUnknownAppliances} className="mt-3 rounded-lg border border-[#D99B26]/40 bg-white px-3 py-2 text-xs font-semibold text-[#775313] hover:bg-[#FAF6EE]">Exclude unpriced items and continue</button>}
        </div>}

        {!nextQuestion && user && !plan && <div className="rounded-2xl border border-[#D99B26]/35 bg-[#FFFCF5] p-5"><p className="text-xs font-bold uppercase tracking-wide text-[#8C641A]">Ready to calculate</p><p className="mt-2 text-sm text-muted-foreground">PowerUp will calculate from the confirmed details and its appliance presets. The AI will explain those results; it will not create a second set of formulas.</p><button onClick={() => void buildPlan()} disabled={buildingPlan} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E5A93C] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#C99E3B] disabled:opacity-60">{buildingPlan ? <><LoaderCircle className="h-4 w-4 animate-spin" />Calculating your plan…</> : <>Calculate my backup plan <ArrowRight className="h-4 w-4" /></>}</button><button onClick={() => setPlan(null)} className="mt-3 w-full text-xs font-semibold text-[#8C641A] underline underline-offset-2">Review your details in the conversation</button></div>}

        <div className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground"><p className="font-bold text-foreground">Numbers stay grounded</p><p className="mt-1">PowerUp’s existing calculator is the source for loads and runtime. If battery or appliance details are missing, the plan will say so instead of guessing. Messages are processed by the configured AI provider; PowerUp stores usage timestamps, not chat history.</p></div>
      </aside>
    </div>
  </section>
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-white p-3"><div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</div><p className="mt-1 text-lg font-extrabold text-[#775313]">{value}</p></div>
}

function ComparisonValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] text-muted-foreground">{label}</dt><dd className="mt-0.5 font-semibold text-foreground">{value}</dd></div>
}
