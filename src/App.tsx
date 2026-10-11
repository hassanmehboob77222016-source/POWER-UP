import { lazy, Suspense, useEffect, useState } from 'react'
import Lenis from 'lenis'
import { NotchNavbar } from '@/components/navbar/notch-navbar'
import { HeroSection } from '@/components/home/hero-section'
import { BenefitsSection } from '@/components/home/benefits-section'
import { Footer } from '@/components/home/footer'
import { BackupWizard } from '@/components/setup/backup-wizard'
import type { AuthMode } from '@/components/auth/auth-page'
const EnergyLoader = lazy(() => import('@/components/analysis/energy-loader').then(module => ({ default: module.EnergyLoader })))
const ResultsView = lazy(() => import('@/components/dashboard/results-view').then(module => ({ default: module.ResultsView })))
const UnitMonitoringDashboard = lazy(() => import('@/components/dashboard/unit-monitoring-dashboard').then(module => ({ default: module.UnitMonitoringDashboard })))
const AuthPage = lazy(() => import('@/components/auth/auth-page').then(module => ({ default: module.AuthPage })))
const PlanLibraryPage = lazy(() => import('@/components/plans/plan-library-page').then(module => ({ default: module.PlanLibraryPage })))
const FeedbackPage = lazy(() => import('@/components/feedback/feedback-page').then(module => ({ default: module.FeedbackPage })))
const FeedbackModerationPage = lazy(() => import('@/components/feedback/feedback-moderation-page').then(module => ({ default: module.FeedbackModerationPage })))
const AIBackupChatPage = lazy(() => import('@/components/chat/ai-backup-chat-page').then(module => ({ default: module.AIBackupChatPage })))
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import { SetupInputs, CalculationResults, calculateBackupPlan } from '@/lib/calculations'
import { AICoachPlan, generateAICoachAdvice } from '@/lib/ai-service'
import { PRESET_APPLIANCES } from '@/lib/appliances-data'

type Screen = 'home' | 'setup' | 'analysis' | 'results' | 'dashboard' | 'plans' | 'feedback' | 'moderation' | 'ai-chat' | 'auth'
interface AuthDraft { screen: Screen; userInputs: SetupInputs | null; calcResults: CalculationResults | null; aiCoachPlan: AICoachPlan | null; savedPlanId: string | null; savedPlanName: string; savePlanAfterAuth: boolean }
const AUTH_DRAFT_KEY = 'powerup-auth-return'

function readAuthDraft(): AuthDraft | null {
  try {
    const saved = sessionStorage.getItem(AUTH_DRAFT_KEY)
    return saved ? JSON.parse(saved) as AuthDraft : null
  } catch { return null }
}

export function App() {
  const { user, displayName, isFeedbackAdmin, signOut } = useAuth()
  const [authDraft] = useState(readAuthDraft)
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => new URLSearchParams(window.location.search).get('screen') === 'reset' ? 'auth' : authDraft?.screen ?? 'home')
  const [authMode, setAuthMode] = useState<AuthMode>(() => new URLSearchParams(window.location.search).get('screen') === 'reset' ? 'reset' : 'login')
  const [returnScreen, setReturnScreen] = useState<Screen>(authDraft?.screen ?? 'home')
  const [userInputs, setUserInputs] = useState<SetupInputs | null>(authDraft?.userInputs ?? null)
  const [calcResults, setCalcResults] = useState<CalculationResults | null>(authDraft?.calcResults ?? null)
  const [aiCoachPlan, setAiCoachPlan] = useState<AICoachPlan | null>(authDraft?.aiCoachPlan ?? null)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(authDraft?.savedPlanId ?? null)
  const [savedPlanName, setSavedPlanName] = useState(authDraft?.savedPlanName ?? 'My backup plan')
  const [savePlanAfterAuth, setSavePlanAfterAuth] = useState(authDraft?.savePlanAfterAuth ?? false)
  const [wizardKey, setWizardKey] = useState(0)
  const [hasVisitedAIChat, setHasVisitedAIChat] = useState(authDraft?.screen === 'ai-chat')

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
    let rafId = 0
    const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf) }
    rafId = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(rafId); lenis.destroy() }
  }, [])

  useEffect(() => {
    const startPlan = () => handleStartNewPlan()
    const signIn = () => openAuth('login', 'results')
    window.addEventListener('powerup:create-plan', startPlan)
    window.addEventListener('powerup:sign-in', signIn)
    return () => { window.removeEventListener('powerup:create-plan', startPlan); window.removeEventListener('powerup:sign-in', signIn) }
  })

  const go = (screen: Screen) => { setCurrentScreen(screen); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const handleNavigateHome = () => go('home')
  const handleNavigateCalculator = () => go('setup')
  const handleStartNewPlan = () => { setSavePlanAfterAuth(false); setSavedPlanId(null); setSavedPlanName('My backup plan'); setUserInputs(null); setCalcResults(null); setAiCoachPlan(null); setWizardKey(key => key + 1); go('setup') }
  const handleNavigateDashboard = () => go('dashboard')
  const handleNavigateAIChat = () => { setHasVisitedAIChat(true); go('ai-chat') }
  const openAuth = (mode: AuthMode = 'login', destination: Screen = currentScreen, offerSaveAfterAuth = false) => {
    setAuthMode(mode); setReturnScreen(destination)
    const shouldOfferSave = offerSaveAfterAuth || savePlanAfterAuth
    if (offerSaveAfterAuth) setSavePlanAfterAuth(true)
    try { sessionStorage.setItem(AUTH_DRAFT_KEY, JSON.stringify({ screen: destination, userInputs, calcResults, aiCoachPlan, savedPlanId, savedPlanName, savePlanAfterAuth: shouldOfferSave } satisfies AuthDraft)) } catch { /* Session storage may be unavailable; in-app auth still preserves mounted state. */ }
    go('auth')
  }
  const finishAuth = () => { try { sessionStorage.removeItem(AUTH_DRAFT_KEY) } catch { /* Ignore unavailable storage. */ } if (!user) setSavePlanAfterAuth(false); go(returnScreen) }

  const handleWizardSubmit = async (inputs: SetupInputs) => {
    setUserInputs(inputs); setCurrentScreen('analysis'); window.scrollTo({ top: 0, behavior: 'smooth' })
    const results = calculateBackupPlan(inputs, PRESET_APPLIANCES)
    setCalcResults(results)
    try {
      const plan = await generateAICoachAdvice(inputs, results)
      setAiCoachPlan(plan); setCurrentScreen('results'); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Rule-based coach generation failed', err)
      setAiCoachPlan(null); setCurrentScreen('results')
    }
  }

  const handleOpenSavedPlan = (id: string, name: string, inputs: SetupInputs, results: CalculationResults, advice: AICoachPlan) => {
    setSavedPlanId(id); setSavedPlanName(name); setUserInputs(inputs); setCalcResults(results); setAiCoachPlan(advice); setWizardKey(key => key + 1); go('results')
  }

  const handleAIPlanReady = (inputs: SetupInputs, results: CalculationResults, advice: AICoachPlan) => {
    setUserInputs(inputs); setCalcResults(results); setAiCoachPlan(advice); setSavedPlanId(null); setSavedPlanName('My AI backup plan')
  }

  const handleSavePlan = async (name: string) => {
    if (!supabase || !user || !userInputs || !calcResults || !aiCoachPlan) throw new Error('Sign in and generate a plan before saving it.')
    const record = {
      user_id: user.id,
      plan_name: name.trim(),
      backup_configuration: userInputs as unknown as Json,
      selected_appliances: userInputs.selectedAppliances as unknown as Json,
      calculation_results: { calculation: calcResults, advice: aiCoachPlan } as unknown as Json,
    }
    if (savedPlanId) {
      const { user_id: _owner, ...planFields } = record
      const { data, error } = await supabase.from('backup_plans').update(planFields).eq('id', savedPlanId).eq('user_id', user.id).select('id').maybeSingle()
      if (error) throw error
      if (!data) throw new Error('This saved plan is no longer available to your account. Refresh My Plans and try again.')
    } else {
      const { data, error } = await supabase.from('backup_plans').insert(record).select('id').single()
      if (error) throw error
      setSavedPlanId(data.id)
    }
    setSavedPlanName(name.trim())
    setSavePlanAfterAuth(false)
    try { sessionStorage.removeItem(AUTH_DRAFT_KEY) } catch { /* Ignore unavailable storage. */ }
  }

  const handleEditAnswers = () => go('setup')
  const handleReset = () => { setSavePlanAfterAuth(false); setUserInputs(null); setCalcResults(null); setAiCoachPlan(null); setSavedPlanId(null); setSavedPlanName('My backup plan'); setWizardKey(key => key + 1); go('home') }
  const handleSignOut = async () => {
    try { await signOut(); if (currentScreen === 'plans') go('home') }
    catch (err) { console.error('Sign out failed', err) }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      <NotchNavbar
        currentScreen={currentScreen}
        onNavigateHome={handleNavigateHome}
        onNavigateCalculator={handleNavigateCalculator}
        onNavigateDashboard={handleNavigateDashboard}
        onNavigatePlans={() => go('plans')}
        onNavigateFeedback={() => go('feedback')}
        onNavigateModeration={() => go('moderation')}
        onNavigateAIChat={handleNavigateAIChat}
        onAuthAction={() => openAuth('login')}
        onSignUp={() => openAuth('signup')}
        onSignOut={() => void handleSignOut()}
        displayName={displayName}
        isSignedIn={Boolean(user)}
        isFeedbackAdmin={isFeedbackAdmin}
        onStartSetup={handleStartNewPlan}
      />

      <main className="flex-1 pt-16">
        <Suspense fallback={<div role="status" className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-16 text-sm text-muted-foreground">Loading PowerUp…</div>}>
        {currentScreen === 'home' && <><HeroSection onStartSetup={handleStartNewPlan} onOpenDashboard={handleNavigateDashboard} /><BenefitsSection /></>}

        {/* Keep the wizard mounted while auth is shown so guest inputs survive sign-in. */}
        <div className={currentScreen === 'setup' ? 'pt-6 pb-16' : 'hidden'}>
          <BackupWizard key={wizardKey} initialInputs={userInputs} onSubmit={handleWizardSubmit} onCancel={handleNavigateHome} />
        </div>
        {currentScreen === 'analysis' && <div className="py-12"><EnergyLoader onCancel={handleEditAnswers} /></div>}
        {currentScreen === 'results' && calcResults && userInputs && aiCoachPlan && <div className="pt-6 pb-16"><ResultsView inputs={userInputs} results={calcResults} aiPlan={aiCoachPlan} onEdit={handleEditAnswers} onReset={handleReset} onSave={handleSavePlan} onSignInToSave={() => openAuth('login', 'results', true)} offerSaveAfterAuth={savePlanAfterAuth && Boolean(user)} canSave={Boolean(user)} isSaved={Boolean(savedPlanId)} savedName={savedPlanName} /></div>}
        {currentScreen === 'results' && calcResults && userInputs && !aiCoachPlan && <div className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Could not prepare the advice summary</h1><p className="mt-2 text-sm text-muted-foreground">Your inputs and calculated results are still available. Try generating the plan again.</p><button onClick={() => void handleWizardSubmit(userInputs)} className="mt-5 rounded-xl bg-primary px-5 py-3 font-bold text-black">Retry</button></div>}
        {currentScreen === 'dashboard' && <div className="pt-4 pb-16"><UnitMonitoringDashboard onOpenCalculator={handleStartNewPlan} /></div>}
        {currentScreen === 'plans' && <PlanLibraryPage onSignIn={() => openAuth('login', 'plans')} onOpen={handleOpenSavedPlan} />}
        {currentScreen === 'feedback' && <FeedbackPage onSignIn={() => openAuth('login', 'feedback')} />}
        {currentScreen === 'moderation' && <FeedbackModerationPage />}
        {hasVisitedAIChat && <div className={currentScreen === 'ai-chat' ? '' : 'hidden'}><AIBackupChatPage onSignIn={() => openAuth('login', 'ai-chat')} onPlanReady={handleAIPlanReady} onOpenDetailedPlan={() => go('results')} /></div>}
        {currentScreen === 'auth' && <AuthPage mode={authMode} savePlanIntent={savePlanAfterAuth} onModeChange={setAuthMode} onBack={finishAuth} onComplete={finishAuth} />}
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
