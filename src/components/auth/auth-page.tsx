import React, { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, Mail, UserRound } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset'

interface AuthPageProps {
  mode: AuthMode
  savePlanIntent?: boolean
  onModeChange: (mode: AuthMode) => void
  onBack: () => void
  onComplete: () => void
}

const inputClass = 'w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#D99B26] focus:ring-2 focus:ring-[#D99B26]/20'

export function AuthPage({ mode, savePlanIntent = false, onModeChange, onBack, onComplete }: AuthPageProps) {
  const { configured, configurationError, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(''); setMessage('')
    if (!supabase) { setError(configurationError || 'Supabase is not configured. Check .env.local and restart the app.'); return }
    if (mode === 'signup' && displayName.trim().length < 2) { setError('Enter a display name with at least 2 characters.'); return }
    if ((mode === 'signup' || mode === 'reset') && password.length < 8) { setError('Use a password with at least 8 characters.'); return }
    if ((mode === 'signup' || mode === 'reset') && password !== confirmPassword) { setError('The passwords do not match.'); return }
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { display_name: displayName.trim() }, emailRedirectTo: window.location.origin },
        })
        if (authError) throw authError
        if (!data.session) setMessage('Account created. Check your email to verify your address, then return here to log in.')
        else { await refreshProfile(); onComplete() }
      } else if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
        await refreshProfile(); onComplete()
      } else if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/?screen=reset` })
        if (authError) throw authError
        setMessage('If an account exists for that email, a password reset link is on its way.')
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
        setMessage('Password updated. You are now signed in.')
        window.setTimeout(onComplete, 700)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Welcome back'
  const subtitle = mode === 'signup' ? 'Save your backup plans and share feedback.' : mode === 'forgot' ? 'We will email you a secure reset link.' : mode === 'reset' ? 'Make a new password for your PowerUp account.' : 'Sign in to access your saved plans.'

  return (
    <section className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
        <div className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#B88628]">PowerUp Account</p>
          <h1 className="text-3xl font-extrabold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {savePlanIntent && <p role="status" className="mb-5 rounded-xl border border-[#D99B26]/30 bg-[#FFFCF5] p-3 text-sm leading-relaxed text-[#775313]">Your current backup plan is preserved. After you sign in or create an account, the save form will be ready for you.</p>}
        {!configured && <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{configurationError || 'Authentication is unavailable until Supabase is configured.'}</div>}
        <form className="space-y-4" onSubmit={submit}>
          {mode === 'signup' && <label className="block text-sm font-semibold">Display name<div className="relative mt-1.5"><UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={`${inputClass} pl-10`} autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={80} /></div></label>}
          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && <label className="block text-sm font-semibold">Email address<div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={`${inputClass} pl-10`} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} /></div></label>}
          {(mode === 'login' || mode === 'signup') && <label className="block text-sm font-semibold">Password<div className="relative mt-1.5"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={`${inputClass} pl-10 pr-12`} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{mode === 'signup' && <span className="mt-1 block text-xs font-normal text-muted-foreground">At least 8 characters.</span>}</label>}
          {(mode === 'reset') && <>
            <label className="block text-sm font-semibold">New password<div className="relative mt-1.5"><input className={`${inputClass} pr-12`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          </>}
          {(mode === 'signup' || mode === 'reset') && <label className="block text-sm font-semibold">Confirm password<input className={`${inputClass} mt-1.5`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></label>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          <button disabled={busy || !configured} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E5A93C] px-5 py-3 font-bold text-black transition hover:bg-[#C99E3B] disabled:cursor-not-allowed disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : 'Sign in'}</button>
        </form>
        <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
          {mode === 'login' && <><button onClick={() => onModeChange('forgot')} className="font-semibold text-[#9A6D16] hover:underline">Forgot password?</button><button onClick={() => onModeChange('signup')} className="font-semibold text-[#9A6D16] hover:underline">Create an account</button></>}
          {mode === 'signup' && <button onClick={() => onModeChange('login')} className="font-semibold text-[#9A6D16] hover:underline">Already registered? Sign in</button>}
          {mode === 'forgot' && <button onClick={() => onModeChange('login')} className="font-semibold text-[#9A6D16] hover:underline">Back to sign in</button>}
          {mode === 'reset' && <span className="text-xs text-muted-foreground">Open this page from the password reset email.</span>}
        </div>
      </div>
    </section>
  )
}
