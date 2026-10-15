import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowUpRight, Copy, Check, Edit3, ChevronDown, ChevronUp, Bookmark, LoaderCircle,
  Info, Calendar
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { SetupInputs, CalculationResults } from '@/lib/calculations'
import type { BackupAdvice } from '@/lib/backup-advice'
import type { BackupUpgradeScenario } from '@/lib/backup-upgrade-advisor'
import type { AdvisorResponseV1 } from '@/lib/ai-advisor-contract'
import { AiExplanationPanel } from './ai-explanation-panel'
import { formatHoursMinutes } from '@/lib/duration'

interface ResultsViewProps {
  inputs: SetupInputs
  results: CalculationResults
  advice: BackupAdvice
  upgradeScenarios: BackupUpgradeScenario[]
  upgradeUnavailableReason: string | null
  onEdit: () => void
  onEditBattery: () => void
  onSave: (name: string) => Promise<void>
  onSignInToSave: () => void
  offerSaveAfterAuth: boolean
  canSave: boolean
  isSaved: boolean
  savedName: string
  aiExplanation: Extract<AdvisorResponseV1, { action: 'explain' }> | null
  aiExplanationStatus: 'idle' | 'loading' | 'ready' | 'error'
  aiExplanationError: string
  onRequestExplanation: () => void
}

export function ResultsView({ inputs, results, advice, upgradeScenarios, upgradeUnavailableReason, onEdit, onEditBattery, onSave, onSignInToSave, offerSaveAfterAuth, canSave, isSaved, savedName, aiExplanation, aiExplanationStatus, aiExplanationError, onRequestExplanation }: ResultsViewProps) {
  const [copied, setCopied] = useState(false)
  const [showFormulaDetails, setShowFormulaDetails] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [planName, setPlanName] = useState(savedName)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const saveLock = useRef(false)

  React.useEffect(() => { setPlanName(savedName) }, [savedName])
  React.useEffect(() => { if (offerSaveAfterAuth) setShowSaveForm(true) }, [offerSaveAfterAuth])

  const submitSave = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanName = planName.trim()
    if (!cleanName || cleanName.length > 80) { setSaveMessage('Enter a name between 1 and 80 characters.'); return }
    if (saveLock.current) return
    saveLock.current = true
    setSaving(true); setSaveMessage('')
    try { await onSave(cleanName); setSaveMessage('Plan saved to your account.'); setShowSaveForm(false) }
    catch (error) { setSaveMessage(error instanceof Error ? error.message : 'Could not save the plan.') }
    finally { saveLock.current = false; setSaving(false) }
  }

  // Copy Plan to Clipboard with Confetti Celebration
  const handleCopyPlan = () => {
    const markdownPlan = `
# ⚡ PowerUp — Backup Power Plan
**System:** ${inputs.backupType.toUpperCase()} (${inputs.batteryChemistry.toUpperCase()})
**Target Outage Duration:** ${inputs.typicalOutageHours} Hours

## 📊 Summary Metrics
- **Total Connected Load:** ${results.totalConnectedLoadWatts} W
- **Estimated Energy Use:** ${results.estimatedEnergyWh} Wh
- **Planned Energy Requirement:** ${results.plannedEnergyWh} Wh
- **Usable Battery Capacity:** ${results.usableCapacityWh ?? 'Not available'} Wh
- **Estimated Runtime:** ${formatHoursMinutes(results.smartRuntimeHours)}
- **Runtime status:** ${results.isSufficient === null ? 'Insufficient specifications for estimate' : results.isSufficient ? 'Estimate covers target' : 'Estimate is below target'}

## 💡 PowerUp Recommendations
${advice.tacticalRecommendations.map(r => `- **${r.title}**: ${r.action} (${r.impact})`).join('\n')}

## ⏰ Outage Survival Timeline
${advice.timelineSchedule.map(t => `- **${t.timeSlot}**: ${t.action} [${t.appliancesStatus}]`).join('\n')}

---
*Calculated by PowerUp from the supplied system details*
`.trim()

    navigator.clipboard.writeText(markdownPlan).then(() => {
      setCopied(true)
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#E5A93C', '#10B981', '#F59E0B']
        })
      } catch (e) {
        // Safe fallback
      }
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
              Personalized Backup Dashboard
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">
              {inputs.backupType.toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {advice.verdictTitle}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            {advice.verdictDescription}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-surface text-foreground text-xs font-bold transition-all shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Answers</span>
          </button>

          <button
            onClick={handleCopyPlan}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-black text-xs font-bold hover:bg-primary-hover transition-all shadow-sm shadow-primary/20"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
            <span>{copied ? "Plan Copied!" : "Copy Plan"}</span>
          </button>
          <button
            onClick={() => canSave ? setShowSaveForm(v => !v) : onSignInToSave()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 text-foreground text-xs font-bold hover:bg-primary/20 transition-all"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Update Saved Plan' : canSave ? 'Save Plan' : 'Sign In to Save'}</span>
          </button>
        </div>
      </div>

      {showSaveForm && <form onSubmit={submitSave} className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-border bg-card p-4">
        {!canSave && <div className="w-full rounded-xl bg-[#FAF6EE] p-3 text-sm text-[#775313] sm:basis-full">Your plan is ready. Sign in or create an account to save it permanently. Your current plan will be kept while you authenticate.</div>}
        <label className="flex-1 text-xs font-bold">Plan name<input autoFocus value={planName} onChange={e => setPlanName(e.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-normal focus:border-primary focus:outline-none" /></label>
        <button disabled={saving} className="self-end inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSaved ? 'Update plan' : 'Save plan'}</button>
      </form>}
      {saveMessage && <p role="status" className={`rounded-xl p-3 text-sm ${saveMessage.startsWith('Plan saved') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{saveMessage}</p>}

      <AiExplanationPanel results={results} explanation={aiExplanation} status={aiExplanationStatus} error={aiExplanationError} onRequest={onRequestExplanation} />

      {/* Main Grid: Inspired by dashboard.jpeg */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: 6 Core Metric Cards in 3x2 Grid */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Battery Capacity (matches dashboard.jpeg) */}
            <div className="p-5 rounded-2xl border border-border bg-card relative group hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <span className="text-xs font-bold uppercase font-mono tracking-wider">Battery Reserve</span>
                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-extrabold text-foreground font-mono mb-1">
                {results.usableCapacityWh !== null ? `${(results.usableCapacityWh / 1000).toFixed(1)} kWh` : "Not available"}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mb-3">
                {results.nominalCapacityWh !== null ? `Nominal: ${(results.nominalCapacityWh / 1000).toFixed(1)} kWh` : "Specs not provided"}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden mb-1">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${results.depthOfDischargeRatio !== null ? Math.round(results.depthOfDischargeRatio * 100) : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>0%</span>
                <span className="text-primary font-bold">
                  {results.depthOfDischargeRatio !== null ? `${Math.round(results.depthOfDischargeRatio * 100)}% assumed DoD` : "Chemistry unknown"}
                </span>
                <span>100%</span>
              </div>
              {inputs.hasBattery && (results.nominalCapacityWh === null || results.depthOfDischargeRatio === null) && <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs leading-relaxed text-muted-foreground">{results.nominalCapacityWh === null ? 'Enter the total battery bank capacity' : 'Select the battery chemistry'} to estimate usable reserve and runtime. Load and energy estimates above remain available.</p>
                <button type="button" onClick={onEditBattery} className="mt-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-foreground hover:bg-primary/20">Add battery details</button>
              </div>}
            </div>

            {/* Card 2: Estimated runtime */}
            <div className="p-5 rounded-2xl border border-border bg-card relative group hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <span className="text-xs font-bold uppercase font-mono tracking-wider">Estimated Runtime</span>
                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-extrabold text-foreground font-mono mb-1">
                {results.smartRuntimeHours === null ? '--' : formatHoursMinutes(results.smartRuntimeHours)}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mb-3">
                Continuous-load estimate: {results.continuousRuntimeHours === null ? '--' : formatHoursMinutes(results.continuousRuntimeHours)}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className={`inline-block w-2 h-2 rounded-full ${results.isSufficient === null ? 'bg-amber-500' : results.isSufficient ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className={results.isSufficient === null ? 'text-amber-500 font-mono' : results.isSufficient ? 'text-emerald-500 font-mono' : 'text-red-500 font-mono'}>
                  {results.isSufficient === null ? 'Runtime unavailable' : results.isSufficient ? `Estimate covers ${formatHoursMinutes(inputs.typicalOutageHours)}` : `Estimate short by ${formatHoursMinutes(Math.abs(results.runtimeSurplusDeficitHours ?? 0))}`}
                </span>
              </div>
            </div>

            {/* Card 3: Continuous & Cycled Load */}
            <div className="p-5 rounded-2xl border border-border bg-card relative group hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <span className="text-xs font-bold uppercase font-mono tracking-wider">Average Planned Load</span>
                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-extrabold text-foreground font-mono mb-1 flex items-baseline gap-1">
                <span>{results.averageLoadWatts}</span>
                <span className="text-sm font-sans font-medium text-muted-foreground">W</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mb-3">
                Total connected: {results.totalConnectedLoadWatts}W
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border text-foreground">
                Inverter load: {results.inverterLoadPercentage === null ? 'Not checked' : `${results.inverterLoadPercentage}%`}
              </span>
            </div>

            {/* Card 4: Surge & Inverter Headroom */}
            <div className="p-5 rounded-2xl border border-border bg-card relative group hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <span className="text-xs font-bold uppercase font-mono tracking-wider">Inverter Status</span>
                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xl font-extrabold text-foreground font-mono mb-1">
                {inputs.inverterRatingWatts === null ? inputs.inverterRatingVA ? `${inputs.inverterRatingVA} VA · W unknown` : 'Rating not provided' : `${inputs.inverterRatingWatts} W`}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mb-2">
                Peak starting load: {results.peakSurgeWatts === null ? 'Not available' : `${results.peakSurgeWatts} W`}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mb-2">
                Suggested continuous rating: {results.recommendedInverterWatts === null ? 'Not available' : `about ${results.recommendedInverterWatts} W (includes 25% margin)`}
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                results.surgeWarning === null ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : results.surgeWarning
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {results.surgeWarning === null ? 'Surge specs incomplete' : results.surgeWarning ? 'Surge Warning' : 'Within entered surge rating'}
              </span>
            </div>

            {/* Card 5: Battery Reserve at Outage End */}
            <div className="p-5 rounded-2xl border border-border bg-card relative group hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <span className="text-xs font-bold uppercase font-mono tracking-wider">Outage End Reserve</span>
                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-extrabold text-foreground font-mono mb-1">
                {results.batteryPercentageAtOutageEnd === null ? "Not available" : `${results.batteryPercentageAtOutageEnd}%`}
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Estimated usable energy remaining after the entered planned demand.
              </p>
            </div>

            {/* Card 6: Energy demand and recommended sizing */}
            <div className="p-5 rounded-2xl border border-border bg-card relative group hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between mb-3 text-muted-foreground">
                <span className="text-xs font-bold uppercase font-mono tracking-wider">Estimated energy use</span>
                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xl font-extrabold text-foreground font-mono mb-1">
                {results.estimatedEnergyWh} Wh
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {results.recommendedBatteryCapacityWh === null ? 'Battery sizing unavailable until chemistry and battery type are known.' : `Approx. ${(results.recommendedBatteryCapacityWh / 1000).toFixed(2)} kWh nominal recommended, including 20% planning margin.`}
              </p>
            </div>

          </div>

          {/* APPLIANCE TIERS (Prioritized Strategy) */}
          <div className="p-6 rounded-3xl border border-border bg-card space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Prioritized Appliance Load Schedule
                </h3>
                <p className="text-xs text-muted-foreground">
                  Follow these operating tiers to keep critical devices running without early battery blackout.
                </p>
              </div>
              <span className="text-xs font-mono bg-surface px-2.5 py-1 rounded-xl border border-border">
                {inputs.selectedAppliances.length} Devices Configured
              </span>
            </div>

            <div className="space-y-4">
              {/* Tier 1: Always On */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 font-mono">
                    Tier 1: Always On (Critical Essentials)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {results.applianceTiers.tier1AlwaysOn.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-foreground">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground">{item.reason}</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-500">{item.watts}W</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier 2: Duty-Cycled */}
              {results.applianceTiers.tier2Cycled.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                      Tier 2: Duty-Cycled (Conserves Heavy Energy)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.applianceTiers.tier2Cycled.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-foreground">{item.name}</div>
                          <div className="text-[10px] text-muted-foreground">{item.runSchedule}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-primary block">{item.watts}W</span>
                          <span className="text-[10px] text-emerald-500 font-mono">Saves {item.savedWh}Wh</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tier 3: Restricted */}
              {results.applianceTiers.tier3Restricted.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-red-500 font-mono">
                      Tier 3: Outage Banned (Severe Drain)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results.applianceTiers.tier3Restricted.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-between text-xs">
                        <div className="text-foreground font-semibold">{item.name} ({item.watts}W)</div>
                        <div className="text-[11px] text-red-500 font-medium">{item.warning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* TRANSPARENT CALCULATION MATH (Disclosure Accordion) */}
          <div className="p-5 rounded-2xl border border-border bg-card">
            <button
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="w-full flex items-center justify-between text-left text-xs font-bold text-foreground"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <span>Deterministic Calculation Math & Physics Transparency</span>
              </div>
              {showFormulaDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFormulaDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-border space-y-3 text-xs font-mono"
              >
                <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-muted-foreground block text-[11px]">1. Usable Energy Formula:</span>
                  <p className="text-foreground font-bold">
                    Usable Wh = Nominal Wh × assumed chemistry discharge limit × inverter efficiency ({results.inverterEfficiencyRatio})
                  </p>
                  <p className="text-primary text-[11px]">
                    = {results.nominalCapacityWh ?? 'unknown'} Wh × {results.depthOfDischargeRatio ?? 'unknown'} × {results.inverterEfficiencyRatio} = {results.usableCapacityWh ?? 'not available'} Wh
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-muted-foreground block text-[11px]">2. Continuous Runtime:</span>
                  <p className="text-foreground">
                    Runtime estimate = Usable Wh ÷ total connected W ≈ {results.usableCapacityWh ?? 'unknown'} ÷ {results.totalConnectedLoadWatts} ≈ {formatHoursMinutes(results.continuousRuntimeHours)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-muted-foreground block text-[11px]">3. Smart Cycled Runtime:</span>
                  <p className="text-foreground">
                    Planned runtime estimate = Usable Wh ÷ average planned W ≈ {results.usableCapacityWh ?? 'unknown'} ÷ {results.averageLoadWatts} ≈ {formatHoursMinutes(results.smartRuntimeHours)}
                  </p>
                </div>
              </motion.div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Upgrade comparison, rule-based recommendations and outage timeline */}
        <div className="lg:col-span-4 space-y-6">

          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Info className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Battery upgrade comparison</h3>
            </div>
            {upgradeScenarios.length > 1 ? (
              <div className="space-y-3">
                {upgradeScenarios.filter(item => item.id !== 'current').map(item => (
                  <article key={item.id} className="rounded-xl border border-border bg-surface p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                      <span className="shrink-0 text-[10px] font-semibold text-emerald-700">{formatHoursMinutes(item.results.smartRuntimeHours)} estimated runtime</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>
                    {item.notes.map(note => <p key={note} className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{note}</p>)}
                  </article>
                ))}
              </div>
            ) : upgradeUnavailableReason ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{upgradeUnavailableReason}</p>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">Your current setup meets the outage target; a larger battery is not indicated by this comparison.</p>
            )}
          </section>

          {/* Rule-based backup recommendations */}
          <div className="p-6 rounded-3xl border border-primary/40 bg-card/90 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Backup recommendations
              </h3>
            </div>

            <div className="space-y-3">
              {advice.tacticalRecommendations.map((rec, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-surface border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{rec.title}</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {rec.impact}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rec.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Outage Timeline (Hour-by-Hour) */}
          <div className="p-6 rounded-3xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Hour-by-Hour Outage Timeline
              </h3>
            </div>

            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {advice.timelineSchedule.map((item, idx) => (
                <div key={idx} className="relative text-xs">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                  <div className="font-bold text-foreground mb-0.5 font-mono">{item.timeSlot}</div>
                  <p className="text-muted-foreground leading-normal mb-1">{item.action}</p>
                  <span className="inline-block text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {item.appliancesStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assumptions & Notes */}
          <div className="p-5 rounded-2xl border border-border bg-surface text-xs space-y-2">
            <span className="font-bold text-foreground uppercase tracking-wider text-[10px] font-mono block">
              Assumptions & Technical Boundaries
            </span>
            <ul className="space-y-1.5 text-muted-foreground text-[11px]">
              {advice.assumptionsNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-primary">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>

    </div>
  )
}
