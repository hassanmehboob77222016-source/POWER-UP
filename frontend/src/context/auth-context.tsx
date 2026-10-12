import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, supabaseConfigurationError } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  displayName: string | null
  isFeedbackAdmin: boolean
  loading: boolean
  configured: boolean
  configurationError: string | null
  refreshProfile: () => Promise<void>
  refreshAdminStatus: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isFeedbackAdmin, setIsFeedbackAdmin] = useState(false)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const refreshAdminStatus = useCallback(async () => {
    if (!supabase) { setIsFeedbackAdmin(false); return }
    try {
      const { data, error } = await supabase.rpc('is_feedback_admin')
      setIsFeedbackAdmin(!error && data === true)
    } catch { setIsFeedbackAdmin(false) }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!supabase) return
    try {
      const { data, error } = await supabase.auth.getUser()
      const user = error ? null : data.user
      if (!user) { setDisplayName(null); setIsFeedbackAdmin(false); return }
      const [profileResult] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
        refreshAdminStatus(),
      ])
      setDisplayName(profileResult.data?.display_name || user.user_metadata?.display_name || user.email || null)
    } catch {
      setDisplayName(null)
      setIsFeedbackAdmin(false)
    }
  }, [refreshAdminStatus])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let alive = true
    let authEventReceived = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true
      setSession(nextSession)
      if (!nextSession) { setDisplayName(null); setIsFeedbackAdmin(false) }
      else window.setTimeout(() => { void refreshProfile() }, 0)
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive || authEventReceived) return
      const nextSession = error ? null : data.session
      setSession(nextSession)
      if (nextSession) void refreshProfile()
      else { setDisplayName(null); setIsFeedbackAdmin(false) }
      setLoading(false)
    }).catch(() => {
      if (!alive) return
      setSession(null); setDisplayName(null); setIsFeedbackAdmin(false); setLoading(false)
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [refreshProfile])

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return <AuthContext.Provider value={{ session, user: session?.user ?? null, displayName, isFeedbackAdmin, loading, configured: isSupabaseConfigured, configurationError: supabaseConfigurationError, refreshProfile, refreshAdminStatus, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
