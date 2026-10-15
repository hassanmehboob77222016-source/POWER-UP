import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Lenis from 'lenis'
import { NotchNavbar } from '@/components/navbar/notch-navbar'
import { HeroSection } from '@/components/home/hero-section'
import { BenefitsSection } from '@/components/home/benefits-section'
import { Footer } from '@/components/home/footer'
import { BackupWizard } from '@/components/setup/backup-wizard'
import type { AuthMode } from '@/components/auth/auth-page'
const ResultsView = lazy(() => import('@/components/dashboard/results-view').then(module => ({ default: module.ResultsView })))
const UnitMonitoringDashboard = lazy(() => import('@/components/dashboard/unit-monitoring-dashboard').then(module => ({ default: module.UnitMonitoringDashboard })))
const AuthPage = lazy(() => import('@/components/auth/auth-page').then(module => ({ default: module.AuthPage })))
const PlanLibraryPage = lazy(() => import('@/components/plans/plan-library-page').then(module => ({ default: module.PlanLibraryPage })))
const FeedbackPage = lazy(() => import('@/components/feedback/feedback-page').then(module => ({ default: module.FeedbackPage })))
const FeedbackModerationPage = lazy(() => import('@/components/feedback/feedback-moderation-page').then(module => ({ default: module.FeedbackModerationPage })))
const AiAdvisorPage = lazy(() => import('@/components/advisor/ai-advisor-page').then(module => ({ default: module.AiAdvisorPage })))
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import { requireSavedPlanId, toPlanSaveError } from '@/lib/plan-save'
import { SetupInputs, CalculationResults, calculateBackupPlan } from '@/lib/calculations'
import { generateBackupAdvice, type BackupAdvice } from '@/lib/backup-advice'
import { buildBackupUpgradeScenarios } from '@/lib/backup-upgrade-advisor'
import { PRESET_APPLIANCES } from '@/lib/appliances-data'
import { requestAdvisorExplanation } from '@/lib/advisor-client'
import type { AdvisorResponseV1 } from '@/lib/ai-advisor-contract'
import type { AdvisorLocale } from '@/lib/ai-advisor-contract'

type Screen = 'home' | 'advisor' | 'setup' | 'results' | 'dashboard' | 'plans' | 'feedback' | 'moderation' | 'auth'
interface AuthDraft { screen: Screen; userInputs: SetupInputs | null; calcResults: CalculationResults | null; backupAdvice: BackupAdvice | null; savedPlanId: string | null; savedPlanName: string; savePlanAfterAuth: boolean; advisorLocale?: AdvisorLocale }
const AUTH_DRAFT_KEY = 'powerup-auth-return'
const PENDING_PLAN_ID_KEY = 'powerup-pending-plan-id'

function readPendingPlanId() {
  try { return sessionStorage.getItem(PENDING_PLAN_ID_KEY) } catch { return null }
}

function readAuthDraft(): AuthDraft | null {
  try {
    const saved = sessionStorage.getItem(AUTH_DRAFT_KEY)
    if (!saved) return null
    const draft = JSON.parse(saved) as AuthDraft
    const validScreens: Screen[] = ['home', 'advisor', 'setup', 'results', 'dashboard', 'plans', 'feedback', 'moderation', 'auth']
    if (!validScreens.includes(draft.screen)) return null
    if (!draft.backupAdvice && draft.userInputs && draft.calcResults) {
      return { ...draft, backupAdvice: generateBackupAdvice(draft.userInputs, draft.calcResults) }
    }
    return draft
  } catch { return null }
}

export function App() {
  const { user, displayName, isFeedbackAdmin, signOut, loading } = useAuth()
  const [authDraft] = useState(readAuthDraft)
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => new URLSearchParams(window.location.search).get('screen') === 'reset' ? 'auth' : authDraft?.screen ?? 'home')
  const [authMode, setAuthMode] = useState<AuthMode>(() => new URLSearchParams(window.location.search).get('screen') === 'reset' ? 'reset' : 'login')
  const [returnScreen, setReturnScreen] = useState<Screen>(authDraft?.screen ?? 'home')
  const [userInputs, setUserInputs] = useState<SetupInputs | null>(authDraft?.userInputs ?? null)
  const [calcResults, setCalcResults] = useState<CalculationResults | null>(authDraft?.calcResults ?? null)
  const [backupAdvice, setBackupAdvice] = useState<BackupAdvice | null>(authDraft?.backupAdvice ?? null)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(authDraft?.savedPlanId ?? null)
  const [savedPlanName, setSavedPlanName] = useState(authDraft?.savedPlanName ?? 'My backup plan')
  const [savePlanAfterAuth, setSavePlanAfterAuth] = useState(authDraft?.savePlanAfterAuth ?? false)
  const [wizardKey, setWizardKey] = useState(0)
  const [wizardStartStep, setWizardStartStep] = useState(1)
  const pendingPlanId = useRef<string | null>(readPendingPlanId())
  const [advisorJourney, setAdvisorJourney] = useState(false)
  const [advisorLocale, setAdvisorLocale] = useState<AdvisorLocale>(authDraft?.advisorLocale ?? 'en')
  const [aiExplanation, setAiExplanation] = useState<Extract<AdvisorResponseV1, { action: 'explain' }> | null>(null)
  const [aiExplanationStatus, setAiExplanationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [aiExplanationError, setAiExplanationError] = useState('')
  const explanationRequestId = useRef(0)

  const clearExplanation = () => { explanationRequestId.current += 1; setAiExplanation(null); setAiExplanationStatus('idle'); setAiExplanationError('') }
  const explainPlan = async (inputs: SetupInputs, results: CalculationResults, locale: AdvisorLocale = advisorLocale) => {
    const requestId = ++explanationRequestId.current
    setAiExplanation(null); setAiExplanationStatus('loading'); setAiExplanationError('')
    try {
      const response = await requestAdvisorExplanation(inputs, results, locale)
      if (requestId !== explanationRequestId.current) return
      setAiExplanation(response); setAiExplanationStatus('ready')
    } catch (error) {
      if (requestId !== explanationRequestId.current) return
      setAiExplanation(null)
      setAiExplanationError(error instanceof Error ? error.message : 'The AI Advisor is unavailable.')
      setAiExplanationStatus('error')
    }
  }

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
    let rafId = 0
    const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf) }
    rafId = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(rafId); lenis.destroy() }
  }, [])

  useEffect(() => {
    if (!loading) window.dispatchEvent(new Event('powerup:app-ready'))
  }, [loading])

  useEffect(() => {
    const startPlan = () => handleStartNewPlan()
    const signIn = () => openAuth('login', 'results')
    window.addEventListener('powerup:create-plan', startPlan)
    window.addEventListener('powerup:sign-in', signIn)
    return () => { window.removeEventListener('powerup:create-plan', startPlan); window.removeEventListener('powerup:sign-in', signIn) }
  })

  const go = (screen: Screen) => { setCurrentScreen(screen); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const handleNavigateHome = () => {
    if (!user) {
      try { sessionStorage.removeItem(AUTH_DRAFT_KEY) } catch { /* Ignore unavailable storage. */ }
      setSavePlanAfterAuth(false)
    }
    const url = new URL(window.location.href)
    if (url.searchParams.get('screen') === 'reset') {
      url.searchParams.delete('screen')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }
    go('home')
  }
  const handleNavigateCalculator = () => {
    if (!user) {
      openAuth('login', 'setup')
      return
    }
    go('setup')
  }
  const handleNavigateAdvisor = () => {
    if (!user) {
      openAuth('login', 'advisor')
      return
    }
    handleStartAdvisor()
  }
  const handleStartNewPlan = () => {
    if (!user) {
      openAuth('login', 'setup')
      return
    }
    clearExplanation(); setAdvisorJourney(false); setAdvisorLocale('en'); pendingPlanId.current = crypto.randomUUID(); try { sessionStorage.setItem(PENDING_PLAN_ID_KEY, pendingPlanId.current) } catch { /* Stable ID remains in memory for this editing session. */ } setSavePlanAfterAuth(false); setSavedPlanId(null); setSavedPlanName('My backup plan'); setUserInputs(null); setCalcResults(null); setBackupAdvice(null); setWizardStartStep(1); setWizardKey(key => key + 1); go('setup')
  }
  const handleStartAdvisor = () => {
    if (!user) {
      openAuth('login', 'advisor')
      return
    }
    clearExplanation(); setAdvisorJourney(true); setAdvisorLocale('en'); pendingPlanId.current = crypto.randomUUID(); try { sessionStorage.setItem(PENDING_PLAN_ID_KEY, pendingPlanId.current) } catch { /* Stable ID remains in memory. */ } setSavePlanAfterAuth(false); setSavedPlanId(null); setSavedPlanName('My backup plan'); setUserInputs(null); setCalcResults(null); setBackupAdvice(null); go('advisor')
  }
  const handleAdvisorContinue = (inputs: SetupInputs, locale: AdvisorLocale) => { setAdvisorJourney(true); setAdvisorLocale(locale); setUserInputs(inputs); setCalcResults(null); setBackupAdvice(null); setWizardStartStep(1); setWizardKey(key => key + 1); go('setup') }
  const handleNavigateDashboard = () => {
    if (!user) {
      openAuth('login', 'dashboard')
      return
    }
    go('dashboard')
  }
  const openAuth = (mode: AuthMode = 'login', destination: Screen = currentScreen, offerSaveAfterAuth = false) => {
    setAuthMode(mode); setReturnScreen(destination)
    const shouldOfferSave = offerSaveAfterAuth || savePlanAfterAuth
    if (offerSaveAfterAuth) setSavePlanAfterAuth(true)
    try { sessionStorage.setItem(AUTH_DRAFT_KEY, JSON.stringify({ screen: destination, userInputs, calcResults, backupAdvice, savedPlanId, savedPlanName, savePlanAfterAuth: shouldOfferSave, advisorLocale } satisfies AuthDraft)) } catch { /* Session storage may be unavailable; in-app auth still preserves mounted state. */ }
    go('auth')
  }
  const finishAuth = () => { try { sessionStorage.removeItem(AUTH_DRAFT_KEY) } catch { /* Ignore unavailable storage. */ } if (!user) setSavePlanAfterAuth(false); go(returnScreen) }
  const cancelAuth = () => {
    if (!user) {
      handleNavigateHome()
      return
    }
    go(returnScreen)
  }

  const handleWizardSubmit = (inputs: SetupInputs) => {
    const results = calculateBackupPlan(inputs, PRESET_APPLIANCES)
    const advice = generateBackupAdvice(inputs, results)
    setCalcResults(results)
    setUserInputs(inputs)
    setBackupAdvice(advice)
    clearExplanation()
    go('results')
    if (advisorJourney) void explainPlan(inputs, results, advisorLocale)
  }

  const handleOpenSavedPlan = (id: string, name: string, inputs: SetupInputs) => {
    const results = calculateBackupPlan(inputs, PRESET_APPLIANCES)
    const advice = generateBackupAdvice(inputs, results)
    clearExplanation(); setAdvisorJourney(false); setAdvisorLocale('en'); pendingPlanId.current = null; try { sessionStorage.removeItem(PENDING_PLAN_ID_KEY) } catch { /* Ignore unavailable storage. */ } setSavedPlanId(id); setSavedPlanName(name); setUserInputs(inputs); setCalcResults(results); setBackupAdvice(advice); setWizardStartStep(1); setWizardKey(key => key + 1); go('results')
  }

  const upgradeComparison = useMemo(() => userInputs ? buildBackupUpgradeScenarios(userInputs, PRESET_APPLIANCES) : null, [userInputs])

  const handleSavePlan = async (name: string) => {
    if (!supabase || !user || !userInputs || !calcResults || !backupAdvice) throw new Error('Sign in and generate a plan before saving it.')
    const record = {
      user_id: user.id,
      plan_name: name.trim(),
      backup_configuration: userInputs as unknown as Json,
      selected_appliances: userInputs.selectedAppliances as unknown as Json,
      calculation_results: { calculation: calcResults, advice: backupAdvice } as unknown as Json,
    }
    if (savedPlanId) {
      const { user_id: _owner, ...planFields } = record
      const { data, error } = await supabase.from('backup_plans').update(planFields).eq('id', savedPlanId).eq('user_id', user.id).select('id').maybeSingle()
      requireSavedPlanId({ data, error }, 'This saved plan is no longer available to your account. Refresh My Plans and try again.')
    } else {
      const id = pendingPlanId.current ?? crypto.randomUUID()
      pendingPlanId.current = id
      const { data, error } = await supabase.from('backup_plans').insert({ ...record, id }).select('id').single()
      if (error?.code === '23505') {
        // Recover a request whose insert succeeded but whose response was lost.
        // Avoid an upsert that would try to update the protected owner/id columns.
        const { data: existing, error: lookupError } = await supabase.from('backup_plans').select('id').eq('id', id).eq('user_id', user.id).maybeSingle()
        if (lookupError) throw toPlanSaveError(lookupError)
        if (!existing) throw toPlanSaveError(error)
        const { user_id: _owner, ...planFields } = record
        const { data: updated, error: updateError } = await supabase.from('backup_plans').update(planFields).eq('id', id).eq('user_id', user.id).select('id').maybeSingle()
        setSavedPlanId(requireSavedPlanId({ data: updated, error: updateError }, 'This saved plan is no longer available to your account. Refresh My Plans and try again.'))
      } else {
        setSavedPlanId(requireSavedPlanId({ data, error }))
      }
      pendingPlanId.current = null
      try { sessionStorage.removeItem(PENDING_PLAN_ID_KEY) } catch { /* Ignore unavailable storage. */ }
    }
    setSavedPlanName(name.trim())
    setSavePlanAfterAuth(false)
    try { sessionStorage.removeItem(AUTH_DRAFT_KEY) } catch { /* Ignore unavailable storage. */ }
  }

  const handleEditAnswers = () => { clearExplanation(); setWizardStartStep(1); setWizardKey(key => key + 1); go('setup') }
  const handleEditBatteryDetails = () => { clearExplanation(); setWizardStartStep(2); setWizardKey(key => key + 1); go('setup') }
  const handleSignOut = async () => {
    try { await signOut(); if (currentScreen === 'plans') go('home') }
    catch (err) { console.error('Sign out failed', err) }
  }

  const footerVariant = currentScreen === 'home' ? 'full' : 'minimal'

  useEffect(() => {
    if (loading) return
    const protectedScreens: Screen[] = ['setup', 'results', 'dashboard', 'plans', 'feedback', 'moderation', 'advisor']
    const publicScreens: Screen[] = ['home', 'auth']
    const search = new URLSearchParams(window.location.search)
    const screenParam = search.get('screen')
    const isResetFlow = screenParam === 'reset'
    if (!user && protectedScreens.includes(currentScreen) && !isResetFlow) {
      openAuth('login', currentScreen)
    }
    if (user && currentScreen === 'auth' && !isResetFlow && !authDraft?.screen) {
      go('home')
    }
    if (screenParam === 'reset' && !user) {
      setCurrentScreen('auth')
      setAuthMode('reset')
    }
    if (user && publicScreens.includes(currentScreen) && currentScreen === 'auth' && authMode !== 'reset') {
      go('home')
    }
  }, [currentScreen, user, loading, authDraft, authMode])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      <NotchNavbar
        currentScreen={currentScreen}
        onNavigateHome={handleNavigateHome}
        onNavigateCalculator={handleNavigateCalculator}
        onNavigateAdvisor={handleNavigateAdvisor}
        onNavigateDashboard={handleNavigateDashboard}
        onNavigatePlans={() => go('plans')}
        onNavigateFeedback={() => go('feedback')}
        onNavigateModeration={() => go('moderation')}
        onAuthAction={() => openAuth('login')}
        onSignUp={() => openAuth('signup')}
        onSignOut={() => void handleSignOut()}
        displayName={displayName}
        isSignedIn={Boolean(user)}
        isFeedbackAdmin={isFeedbackAdmin}
      />

      <main className="flex-1 pt-16">
        <Suspense fallback={<div role="status" className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-16 text-sm text-muted-foreground">Loading PowerUp…</div>}>
          {currentScreen === 'home' && <><HeroSection onStartAdvisor={handleStartAdvisor} onStartSetup={handleStartNewPlan} onOpenDashboard={handleNavigateDashboard} /><BenefitsSection /></>}
          {currentScreen === 'advisor' && <AiAdvisorPage onContinue={handleAdvisorContinue} onManual={handleStartNewPlan} />}

          {/* Keep the wizard mounted while auth is shown so guest inputs survive sign-in. */}
          <div className={currentScreen === 'setup' ? 'pt-6 pb-16' : 'hidden'}>
            <BackupWizard key={wizardKey} initialInputs={userInputs} initialStep={wizardStartStep} onSubmit={handleWizardSubmit} onCancel={handleNavigateHome} />
          </div>
          {currentScreen === 'results' && calcResults && userInputs && backupAdvice && upgradeComparison && <div className="pt-6 pb-16"><ResultsView inputs={userInputs} results={calcResults} advice={backupAdvice} upgradeScenarios={upgradeComparison.scenarios} upgradeUnavailableReason={upgradeComparison.unavailableReason} onEdit={handleEditAnswers} onEditBattery={handleEditBatteryDetails} onSave={handleSavePlan} onSignInToSave={() => openAuth('login', 'results', true)} offerSaveAfterAuth={savePlanAfterAuth && Boolean(user)} canSave={Boolean(user)} isSaved={Boolean(savedPlanId)} savedName={savedPlanName} aiExplanation={aiExplanation} aiExplanationStatus={aiExplanationStatus} aiExplanationError={aiExplanationError} onRequestExplanation={() => void explainPlan(userInputs, calcResults)} /></div>}
          {currentScreen === 'dashboard' && <div className="pt-4 pb-16"><UnitMonitoringDashboard onOpenCalculator={handleStartNewPlan} onSignIn={() => openAuth('login', 'dashboard')} /></div>}
          {currentScreen === 'plans' && <PlanLibraryPage onSignIn={() => openAuth('login', 'plans')} onOpen={handleOpenSavedPlan} />}
          {currentScreen === 'feedback' && <FeedbackPage onSignIn={() => openAuth('login', 'feedback')} />}
          {currentScreen === 'moderation' && <FeedbackModerationPage />}
          {currentScreen === 'auth' && <AuthPage mode={authMode} savePlanIntent={savePlanAfterAuth} onModeChange={setAuthMode} onBack={cancelAuth} onComplete={finishAuth} />}
        </Suspense>
      </main>
      <Footer
        variant={footerVariant}
        onNavigateHome={handleNavigateHome}
        onNavigateCalculator={handleNavigateCalculator}
        onNavigateDashboard={handleNavigateDashboard}
      />
    </div>
  )
}

export default App
