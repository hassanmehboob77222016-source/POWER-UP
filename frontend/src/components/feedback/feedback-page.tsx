import React, { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle, MessageSquareText, Star, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'

type FeedbackType = 'general' | 'bug' | 'feature' | 'suggestion'
interface FeedbackRow { id: string; rating: number | null; comment: string; feedback_type: FeedbackType; created_at: string; status?: string }
const labels: Record<FeedbackType, string> = { general: 'General feedback', bug: 'Bug report', feature: 'Feature request', suggestion: 'Suggestion' }

export function FeedbackPage({ onSignIn }: { onSignIn: () => void }) {
  const { user, configured, loading: authLoading } = useAuth()
  const [publicRows, setPublicRows] = useState<FeedbackRow[]>([])
  const [ownRows, setOwnRows] = useState<FeedbackRow[]>([])
  const [rating, setRating] = useState(0)
  const [kind, setKind] = useState<FeedbackType>('general')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const submissionLock = useRef(false)

  const load = useCallback(async () => {
    if (authLoading) return
    if (!supabase) { setBusy(false); return }
    setBusy(true); setError('')
    const publicResult = await supabase.from('feedback').select('id,rating,comment,feedback_type,created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(20)
    if (publicResult.error) setError(publicResult.error.message)
    setPublicRows((publicResult.data || []) as FeedbackRow[])
    if (user) {
      const ownResult = await supabase.rpc('get_my_feedback')
      if (ownResult.error) setError(ownResult.error.message)
      setOwnRows((ownResult.data || []) as FeedbackRow[])
    } else setOwnRows([])
    setBusy(false)
  }, [user, authLoading])
  useEffect(() => { void load() }, [load])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('')
    const clean = comment.trim()
    if (clean.length < 5 || clean.length > 2000) { setError('Comment must be between 5 and 2,000 characters.'); return }
    if (!user || !supabase) { onSignIn(); return }
    if (submissionLock.current) return
    submissionLock.current = true
    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('feedback').insert({ user_id: user.id, rating: rating || null, comment: clean, feedback_type: kind })
      if (insertError) setError(insertError.message)
      else { setComment(''); setRating(0); setNotice('Thanks for your feedback. It is queued for review before appearing publicly.'); await load() }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Feedback could not be submitted. Check your connection and try again.')
    } finally { submissionLock.current = false; setSubmitting(false) }
  }

  const deleteOwn = async (row: FeedbackRow) => {
    if (!window.confirm('Delete this feedback?')) return
    if (!supabase) return
    const { data, error: deleteError } = await supabase.from('feedback').delete().eq('id', row.id).select('id').maybeSingle()
    if (deleteError) setError(deleteError.message)
    else if (!data) setError('This feedback could not be deleted. Refresh your submissions and try again.')
    else { setOwnRows(rows => rows.filter(item => item.id !== row.id)); setPublicRows(rows => rows.filter(item => item.id !== row.id)); setNotice('Feedback deleted.') }
  }

  const editOwn = async (row: FeedbackRow) => {
    const next = window.prompt('Edit your comment', row.comment)?.trim()
    if (!next || next === row.comment) return
    if (next.length < 5 || next.length > 2000) { setError('Comment must be between 5 and 2,000 characters.'); return }
    if (!supabase) return
    const { data, error: updateError } = await supabase.from('feedback').update({ comment: next }).eq('id', row.id).select('id').maybeSingle()
    if (updateError) setError(updateError.message)
    else if (!data) setError('This feedback could not be updated. Refresh your submissions and try again.')
    else {
      const needsReview = row.status === 'approved' || row.status === 'rejected'
      setOwnRows(rows => rows.map(item => item.id === row.id ? { ...item, comment: next, status: needsReview ? 'pending' : item.status } : item))
      setPublicRows(rows => rows.filter(item => item.id !== row.id))
      setNotice(needsReview ? 'Feedback updated and returned to pending review.' : 'Feedback updated.')
    }
  }

  return <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
    <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#B88628]">Help improve PowerUp</p><h1 className="text-3xl font-extrabold sm:text-4xl">Feedback & ideas</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Share a bug, an idea, or how your backup plan worked for you.</p></div>
    {!configured && <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Feedback needs Supabase configuration.</div>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
      <div className="space-y-6">
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-bold">Leave feedback</h2>
          {!user && <p className="mt-2 text-sm text-muted-foreground">Sign in is required to submit feedback. Browsing approved feedback is open to everyone. <button type="button" onClick={onSignIn} className="font-bold text-[#9A6D16] underline">Sign in</button></p>}
          <fieldset className="mt-5"><legend className="mb-2 text-sm font-semibold">Rating <span className="font-normal text-muted-foreground">(optional)</span></legend><div className="flex gap-1" role="radiogroup" aria-label="Rating"><button type="button" aria-label="No rating" onClick={() => setRating(0)} className={`mr-2 text-xs ${rating === 0 ? 'font-bold text-[#9A6D16]' : 'text-muted-foreground'}`}>Skip</button>{[1,2,3,4,5].map(value => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value > 1 ? 's' : ''}`} onClick={() => setRating(value)}><Star className={`h-6 w-6 ${value <= rating ? 'fill-[#E5A93C] text-[#B88628]' : 'text-border'}`} /></button>)}</div></fieldset>
          <label className="mt-5 block text-sm font-semibold">Category<select value={kind} onChange={e => setKind(e.target.value as FeedbackType)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="mt-4 block text-sm font-semibold">Comment<textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} minLength={5} rows={5} placeholder="Tell us what worked or what we could improve…" className="mt-1.5 w-full resize-y rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D99B26] focus:ring-2 focus:ring-[#D99B26]/20" required /></label>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>5–2,000 characters</span><span>{comment.length}/2000</span></div>
          <button disabled={!configured || !user || submitting} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E5A93C] px-4 py-3 font-bold text-black hover:bg-[#C99E3B] disabled:cursor-not-allowed disabled:opacity-55">{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}Submit feedback</button>
          <p className="mt-3 text-xs text-muted-foreground">New feedback is private until reviewed. We limit each account to five submissions per hour.</p>
        </form>
        {user && ownRows.length > 0 && <div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-3 text-lg font-bold">Your submissions</h2><div className="space-y-3">{ownRows.map(row => <article key={row.id} className="rounded-xl bg-[#FAF6EE] p-3"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold capitalize text-[#8C641A]">{labels[row.feedback_type]}</span><span className="ml-2 text-xs text-muted-foreground">· {row.status}</span></div><div className="flex gap-2"><button onClick={() => void editOwn(row)} className="text-xs font-semibold text-[#8C641A] underline">Edit</button><button aria-label="Delete feedback" onClick={() => void deleteOwn(row)} className="text-red-700"><Trash2 className="h-4 w-4" /></button></div></div><p className="mt-2 whitespace-pre-wrap text-sm">{row.comment}</p></article>)}</div></div>}
      </div>
      <div><div className="mb-4 flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-[#B88628]" /><h2 className="text-xl font-bold">Community feedback</h2><span className="rounded-full bg-[#FAF6EE] px-2 py-0.5 text-xs font-bold">Latest 20</span></div>
        {busy && <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading approved comments…</div>}
        {!busy && publicRows.length === 0 && !error && <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-[#B88628]" /><h3 className="mt-3 font-bold">A fresh start</h3><p className="mt-1 text-sm text-muted-foreground">No approved feedback yet. Be the first to share an idea.</p></div>}
        {!busy && publicRows.length > 0 && <div className="space-y-3">{publicRows.map(row => <article key={row.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#FAF6EE] px-2.5 py-1 text-xs font-bold capitalize text-[#8C641A]">{labels[row.feedback_type]}</span><time className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</time></div>{row.rating && <div aria-label={`${row.rating} out of 5 stars`} className="mt-3 flex gap-0.5">{[1,2,3,4,5].map(n => <Star key={n} className={`h-4 w-4 ${n <= row.rating! ? 'fill-[#E5A93C] text-[#B88628]' : 'text-border'}`} />)}</div>}<p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{row.comment}</p><p className="mt-3 text-xs text-muted-foreground">PowerUp community</p></article>)}</div>}
      </div>
    </div>
  </section>
}
