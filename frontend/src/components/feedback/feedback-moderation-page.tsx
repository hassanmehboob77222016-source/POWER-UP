import { useCallback, useEffect, useState } from 'react'
import { Check, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'

type FeedbackType = 'general' | 'bug' | 'feature' | 'suggestion'
interface PendingFeedback { id: string; rating: number | null; comment: string; feedback_type: FeedbackType; created_at: string }
const label: Record<FeedbackType, string> = { general: 'General feedback', bug: 'Bug report', feature: 'Feature request', suggestion: 'Suggestion' }

export function FeedbackModerationPage() {
  const { user, loading: authLoading, isFeedbackAdmin, refreshAdminStatus } = useAuth()
  const [rows, setRows] = useState<PendingFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(''); setNotice('')
    if (!supabase || !user) { setRows([]); setLoading(false); return }
    await refreshAdminStatus()
    const { data: allowed, error: authError } = await supabase.rpc('is_feedback_admin')
    if (authError) { setRows([]); setError(authError.message); setLoading(false); return }
    if (allowed !== true) { setRows([]); setLoading(false); return }
    const { data, error: queryError } = await supabase.from('feedback').select('id,rating,comment,feedback_type,created_at').eq('status', 'pending').order('created_at', { ascending: true }).limit(100)
    if (queryError) setError(queryError.message)
    setRows((data || []) as PendingFeedback[])
    setLoading(false)
  }, [user, refreshAdminStatus])

  useEffect(() => { if (!authLoading) void load() }, [authLoading, load])

  const moderate = async (row: PendingFeedback, status: 'approved' | 'rejected') => {
    if (!supabase || !isFeedbackAdmin) { setError('Your administrator access is not available. Refresh and sign in again.'); return }
    setActiveId(row.id); setError(''); setNotice('')
    const { data, error: updateError } = await supabase.from('feedback').update({ status }).eq('id', row.id).eq('status', 'pending').select('id').maybeSingle()
    if (updateError) setError(updateError.message)
    else if (!data) setError('This item is no longer pending. Refresh the queue and try again.')
    else { setRows(current => current.filter(item => item.id !== row.id)); setNotice(`Feedback ${status}.`) }
    setActiveId('')
  }

  return <section className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
    <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#B88628]">Restricted workspace</p><h1 className="flex items-center gap-3 text-3xl font-extrabold sm:text-4xl"><ShieldCheck className="h-8 w-8 text-[#B88628]" />Feedback moderation</h1><p className="mt-2 text-sm text-muted-foreground">Review pending comments. Database policies and triggers enforce every moderation action.</p></div>
    {authLoading || loading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" />Checking moderator access…</div> : !user ? <div className="rounded-2xl border border-border bg-card p-6">Sign in with an administrator account to continue.</div> : !isFeedbackAdmin ? <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">This account is not on the database administrator allowlist. If you were just added, use “Recheck access” below.</div> : null}
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="mb-4 flex justify-end"><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-[#FAF6EE]"><RefreshCw className="h-4 w-4" />Recheck access / refresh</button></div>
    {!authLoading && !loading && user && isFeedbackAdmin && rows.length === 0 && !error && <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#B88628]" /><h2 className="mt-3 text-xl font-bold">Nothing waiting for review</h2><p className="mt-1 text-sm text-muted-foreground">New submissions will appear here with their rating and category.</p></div>}
    {!loading && user && isFeedbackAdmin && rows.length > 0 && <div className="space-y-4">{rows.map(row => <article key={row.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#FAF6EE] px-2.5 py-1 text-xs font-bold capitalize text-[#8C641A]">{label[row.feedback_type]}</span><time className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</time></div>{row.rating && <p className="mt-3 text-sm font-semibold text-[#8C641A]">Rating: {row.rating}/5</p>}<p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{row.comment}</p><div className="mt-4 flex justify-end gap-2"><button disabled={activeId === row.id} onClick={() => void moderate(row, 'rejected')} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-800 disabled:opacity-50"><X className="h-4 w-4" />Reject</button><button disabled={activeId === row.id} onClick={() => void moderate(row, 'approved')} className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5A93C] px-3 py-2 text-sm font-bold text-black disabled:opacity-50">{activeId === row.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Approve</button></div></article>)}</div>}
  </section>
}
