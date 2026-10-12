import React, { useState } from "react"
import { Home, Sliders, LayoutDashboard, Menu, X, MessageSquareText, UserRound, LogOut, FolderOpen, ShieldCheck, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import LogoIcon from "@/assets/logo/logo-icon"
import { motion, AnimatePresence } from "framer-motion"

// Helper component for navigation links
interface NavLinkProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  onClick: () => void
}

const NavLink = ({ icon: Icon, label, active, onClick }: NavLinkProps) => (
  <button
    onClick={onClick}
    className={cn(
      "group flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap",
      active ? "text-[#E5A93C] font-bold" : "text-white/75 hover:text-white"
    )}
  >
    <Icon className={cn("w-3.5 h-3.5 transition-colors", active ? "text-[#B88628]" : "opacity-70 group-hover:opacity-100 group-hover:text-[#B88628]")} />
    <span>{label}</span>
  </button>
)

interface NotchNavbarProps extends React.HTMLAttributes<HTMLElement> {
  currentScreen?: string
  onNavigateHome: () => void
  onNavigateCalculator: () => void
  onNavigateAdvisor: () => void
  onNavigateDashboard: () => void
  onNavigatePlans: () => void
  onNavigateFeedback: () => void
  onNavigateModeration: () => void
  onAuthAction: () => void
  onSignUp: () => void
  onSignOut: () => void
  displayName?: string | null
  isSignedIn?: boolean
  isFeedbackAdmin?: boolean
  logo?: React.ReactNode
}

export function NotchNavbar({
  className,
  currentScreen = "home",
  onNavigateHome,
  onNavigateCalculator,
  onNavigateAdvisor,
  onNavigateDashboard,
  onNavigatePlans,
  onNavigateFeedback,
  onNavigateModeration,
  onAuthAction,
  onSignUp,
  onSignOut,
  displayName,
  isSignedIn = false,
  isFeedbackAdmin = false,
  ...props
}: NotchNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Navigation items configuration
  const items = {
    left: [
      { label: "Home", icon: Home, active: currentScreen === "home", onClick: onNavigateHome },
      { label: "AI Advisor", icon: Sparkles, active: currentScreen === "advisor", onClick: onNavigateAdvisor },
      { label: "Calculator", icon: Sliders, active: currentScreen === "setup", onClick: onNavigateCalculator },
    ],
    right: [
      { label: "Monitoring", icon: LayoutDashboard, active: currentScreen === "dashboard", onClick: onNavigateDashboard },
      ...(isSignedIn ? [{ label: "My Plans", icon: FolderOpen, active: currentScreen === "plans", onClick: onNavigatePlans }] : []),
      { label: "Feedback", icon: MessageSquareText, active: currentScreen === "feedback", onClick: onNavigateFeedback },
      ...(isFeedbackAdmin ? [{ label: "Moderation", icon: ShieldCheck, active: currentScreen === "moderation", onClick: onNavigateModeration }] : []),
    ],
  }

  return (
    <>
      <header className={cn("fixed top-0 inset-x-0 z-50 h-16 flex px-0 select-none", className)} {...props}>

        {/* Left Side Bar - Flexible width */}
        <div className="flex-1 h-10 bg-[#111116]/75 backdrop-blur-xl z-20 relative min-w-0">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={0.75} />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={0.5} />
          </svg>
        </div>

        {/* Responsive Notch Container - 3 Slices */}
        <div className="flex h-16 relative z-10 shrink-0 -ml-px">

          {/* Left Slice (Corner) */}
          <div className="w-[50px] h-full relative shrink-0">
            <div
              className="absolute inset-0 bg-[#111116]/75 backdrop-blur-xl"
              style={{ clipPath: "path('M0 0 H50 V64 C25 64 25 40 0 40 Z')" }}
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 50 64">
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={0.75} />
              <path d="M0 36.5 C25 36.5 25 60.5 50 60.5" fill="none" stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={0.5} />
            </svg>
          </div>

          {/* Center Slice (Flexible Content Area) */}
          <div className="flex-1 h-full relative min-w-0 -ml-px">
            {/* Background & Lines Layer */}
            <div className="absolute inset-0 bg-[#111116]/75 backdrop-blur-xl">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <line x1="0" y1="63.5" x2="100%" y2="63.5" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={0.75} />
                <line x1="0" y1="60.5" x2="100%" y2="60.5" stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={0.5} />
              </svg>
            </div>

            {/* Content Layer */}
            <div className="relative w-full h-full grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end pb-2 px-4 md:px-8 gap-2">
              {/* Desktop Left Nav - hugs the logo */}
              <nav className="hidden lg:flex gap-3 md:gap-4 lg:gap-4 mb-1 shrink-0 items-center justify-self-end pr-1">
                {items.left.map((item) => (
                  <NavLink key={item.label} {...item} />
                ))}
              </nav>

              {/* Mobile Menu Button (Left) */}
              <button
                className="lg:hidden mb-1 p-1 text-white/75 hover:text-white transition-colors justify-self-start"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-[#E5A93C]" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Logo (Center) */}
              <div className="flex justify-center items-center shrink-0 w-[92px] md:w-[100px] mb-1 justify-self-center">
                {props.logo || (
                  <button
                    onClick={onNavigateHome}
                    className="flex items-center justify-center group focus:outline-none"
                    aria-label="PowerUp Home"
                  >
                    <LogoIcon className="h-10 w-9 text-[#E5A93C] hover:scale-105 transition-transform drop-shadow-[0_0_6px_rgba(229,169,60,0.25)]" />
                  </button>
                )}
              </div>

              {/* Desktop Right Nav - links only, hugs the logo */}
              <nav className="hidden lg:flex gap-3 items-center shrink-0 mb-1 justify-self-start pl-1">
                {items.right.map((item) => (
                  <NavLink key={item.label} {...item} />
                ))}
              </nav>

              {/* Keep the logo centered; Calculator is the single navigation entry to setup. */}
              <div className="lg:hidden" aria-hidden="true" />
            </div>
          </div>

          {/* Right Slice (Corner) */}
          <div className="w-[50px] h-full relative shrink-0 -ml-px">
            <div
              className="absolute inset-0 bg-[#111116]/75 backdrop-blur-xl"
              style={{ clipPath: "path('M0 0 H50 V40 C25 40 25 64 0 64 Z')" }}
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 50 64">
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={0.75} />
              <path d="M0 60.5 C25 60.5 25 36.5 50 36.5" fill="none" stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={0.5} />
            </svg>
          </div>
        </div>

        {/* Right Side Bar - holds account actions on desktop */}
        <div className="flex-1 h-10 bg-[#111116]/75 backdrop-blur-xl z-20 relative min-w-0 -ml-px">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={0.75} />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={0.5} />
          </svg>

          <div className="relative hidden h-[36px] items-center justify-end gap-3 overflow-hidden px-4 lg:flex">
 

            {isSignedIn ? (
              <>
                <span className="max-w-28 truncate text-xs font-semibold text-white" title={displayName || ""}>
                  <UserRound className="mr-1 inline h-3.5 w-3.5" />
                  {displayName || "Account"}
                </span>
                <button onClick={onSignOut} className="text-white/70 hover:text-white" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={onAuthAction} className="text-xs font-bold text-[#E5A93C] hover:underline">
                  Login
                </button>
                <button
                  onClick={onSignUp}
                  className="rounded-xl border border-[#E5A93C]/50 bg-[#24242A] px-3 py-1 text-xs font-bold text-white hover:bg-[#303038]"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 bg-[#111116]/85 backdrop-blur-xl border-b border-white/15 p-4 lg:hidden shadow-xl"
          >
            <nav className="flex flex-col gap-2">
              {[...items.left, ...items.right].map((item) => (
                <button
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left",
                    item.active ? "text-[#E5A93C] font-bold" : "text-white/90 font-medium"
                  )}
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    item.onClick()
                  }}
                >
                  <item.icon className="w-5 h-5 text-[#E5A93C]" />
                  <span>{item.label}</span>
                </button>
              ))}
              {isSignedIn ? (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    onSignOut()
                  }}
                  className="flex items-center gap-3 p-3 text-left font-medium text-white"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out · {displayName || "Account"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      onAuthAction()
                    }}
                    className="flex flex-1 items-center gap-3 rounded-lg p-3 text-left font-medium text-white hover:bg-white/10"
                  >
                    <UserRound className="h-5 w-5" />
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      onSignUp()
                    }}
                    className="flex flex-1 items-center gap-3 rounded-lg border border-[#E5A93C]/50 bg-[#24242A] p-3 text-left font-semibold text-white hover:bg-[#303038]"
                  >
                    <UserRound className="h-5 w-5" />
                    Sign Up
                  </button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
