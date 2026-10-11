import React, { useCallback, useEffect, useState } from 'react'
import { BatteryCharging, Clock3, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'
import type { SetupInputs, CalculationResults } from '@/lib/calculations'
import type { AICoachPlan } from '@/lib/ai-service'

interface SavedPlan {
  id: string
  plan_name: string
  backup_configuration: SetupInputs
  selected_appliances: SetupInputs['selectedAppliances']
  calculation_results: { calculation: CalculationResults; advice: AICoachPlan }
  updated_at: string
}
interface Props { onOpen: (id: string, name: string, inputs: SetupInputs, results: CalculationResults, advice: AICoachPlan) => void; onSignIn: () => void }
const buttonClass = 'rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:border-[#D99B26] hover:bg-[#FAF6EE]'

export function PlanLibraryPage({ onOpen, onSignIn }: Props) {
  const { user, configured, loading: authLoading } = useAuth()
  const [plans, setPlans] = useState<SavedPlan[]>([])
  const [busy, setBusy] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadPlans = useCallback(async () => {
    setError(''); setBusy(true)
    if (authLoading) return
    if (!supabase || !user) { setPlans([]); setBusy(false); return }
    const { data, error: queryError } = await supabase.from('backup_plans').select('id,plan_name,backup_configuration,selected_appliances,calculation_results,updated_at').order('updated_at', { ascending: false })
    if (queryError) setError(queryError.message)
    setPlans((data || []) as unknown as SavedPlan[]); setBusy(false)
  }, [user, authLoading])

  useEffect(() => { void loadPlans() }, [loadPlans])

  const renamePlan = async (plan: SavedPlan) => {
    const nextName = window.prompt('Plan name', plan.plan_name)?.trim()
    if (!nextName || nextName === plan.plan_name) return
    if (nextName.length > 80) { setError('Plan names must be 80 characters or fewer.'); return }
    setWorkingId(plan.id); setError('')
    const { data, error: updateError } = await supabase!.from('backup_plans').update({ plan_name: nextName }).eq('id', plan.id).select('id').maybeSingle()
    if (updateError) setError(updateError.message)
    else if (!data) setError('This plan is no longer available. Refresh your plan list and try again.')
    else { setNotice('Plan renamed.'); await loadPlans() }
    setWorkingId('')
  }

  const deletePlan = async (plan: SavedPlan) => {
    if (!window.confirm(`Delete “${plan.plan_name}”? This cannot be undone.`)) return
    setWorkingId(plan.id); setError('')
    const { data, error: deleteError } = await supabase!.from('backup_plans').delete().eq('id', plan.id).select('id').maybeSingle()
    if (deleteError) setError(deleteError.message)
    else if (!data) setError('This plan is no longer available. Refresh your plan list and try again.')
    else { setPlans(rows => rows.filter(row => row.id !== plan.id)); setNotice('Plan deleted.') }
    setWorkingId('')
  }

  return <section className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#B88628]">Your PowerUp Library</p><h1 className="text-3xl font-extrabold sm:text-4xl">My backup plans</h1><p className="mt-2 text-sm text-muted-foreground">Plans are private to your account.</p></div>{user && <button onClick={() => { window.dispatchEvent(new CustomEvent('powerup:create-plan')) }} className="inline-flex items-center gap-2 rounded-xl bg-[#E5A93C] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#C99E3B]"><Plus className="h-4 w-4" /> Create a plan</button>}</div>
    {!configured && <Notice>Set up Supabase to enable accounts and saved plans. You can still use the backup planner as a guest.</Notice>}
    {!user && configured && <div className="rounded-2xl border border-border bg-card p-8 text-center"><h2 className="text-xl font-bold">Sign in to view your plans</h2><p className="mt-2 text-sm text-muted-foreground">Your current guest plan stays available when you sign in.</p><button onClick={onSignIn} className="mt-5 rounded-xl bg-[#E5A93C] px-5 py-2.5 font-bold text-black">Sign in</button></div>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {user && busy && <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading plans…</div>}
    {user && !busy && plans.length === 0 && !error && <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><BatteryCharging className="mx-auto h-8 w-8 text-[#B88628]" /><h2 className="mt-3 text-xl font-bold">No saved plans yet</h2><p className="mt-2 text-sm text-muted-foreground">Generate a plan and choose “Save plan” to keep it here.</p></div>}
    {user && !busy && plans.length > 0 && <div className="grid gap-4 md:grid-cols-2">{plans.map(plan => <article key={plan.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{plan.plan_name}</h2><p className="mt-1 text-xs text-muted-foreground">Updated {new Date(plan.updated_at).toLocaleDateString()}</p></div><span className="rounded-full bg-[#FAF6EE] px-2.5 py-1 text-xs font-bold capitalize text-[#8C641A]">{plan.backup_configuration.backupType}</span></div><div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><BatteryCharging className="h-4 w-4" />{plan.calculation_results.calculation.isCalculable ? `${(plan.calculation_results.calculation.usableCapacityWh / 1000).toFixed(1)} kWh usable` : 'Capacity unknown'}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{plan.backup_configuration.typicalOutageHours}h outage</span></div><div className="mt-5 flex flex-wrap gap-2"><button className={buttonClass} onClick={() => onOpen(plan.id, plan.plan_name, plan.backup_configuration, plan.calculation_results.calculation, plan.calculation_results.advice)}>Open plan</button><button disabled={workingId === plan.id} className={buttonClass} onClick={() => void renamePlan(plan)}><Pencil className="mr-1 inline h-3.5 w-3.5" />Rename</button><button disabled={workingId === plan.id} className={`${buttonClass} text-red-700`} onClick={() => void deletePlan(plan)}><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button></div></article>)}</div>}
  </section>
}

function Notice({ children }: { children: React.ReactNode }) { return <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{children}</div> }
