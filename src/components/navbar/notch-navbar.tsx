import React, { useState } from "react"
import { Home, Sliders, LayoutDashboard, Sparkles, Menu, X, MessageSquareText, UserRound, LogOut, FolderOpen, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import LogoIcon from "@/assets/logo/logo-icon"
import { motion, AnimatePresence } from "framer-motion"

interface NavLinkProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  onClick: () => void
}

// Helper component for navigation links
const NavLink = ({ icon: Icon, label, active, onClick }: NavLinkProps) => (
  <button 
    onClick={onClick}
    className={cn(
      "group flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap",
      active ? "text-[#B88628] font-bold" : "text-foreground/75 hover:text-[#B88628]"
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
  onNavigateDashboard: () => void
  onStartSetup: () => void
  onNavigatePlans: () => void
  onNavigateFeedback: () => void
  onNavigateModeration: () => void
  onNavigateAIChat: () => void
  onAuthAction: () => void
  onSignUp: () => void
  onSignOut: () => void
  displayName?: string | null
  isSignedIn?: boolean
  isFeedbackAdmin?: boolean
}

export function NotchNavbar({
  className,
  currentScreen = 'home',
  onNavigateHome,
  onNavigateCalculator,
  onNavigateDashboard,
  onStartSetup,
  onNavigatePlans,
  onNavigateFeedback,
  onNavigateModeration,
  onNavigateAIChat,
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
      { label: "Home", icon: Home, active: currentScreen === 'home', onClick: onNavigateHome },
      { label: "Calculator", icon: Sliders, active: currentScreen === 'setup' || currentScreen === 'analysis', onClick: onNavigateCalculator },
      { label: "AI Chat", icon: Sparkles, active: currentScreen === 'ai-chat', onClick: onNavigateAIChat }
    ],
    right: [
      { label: "Monitoring", icon: LayoutDashboard, active: currentScreen === 'dashboard', onClick: onNavigateDashboard },
      ...(isSignedIn ? [{ label: "My Plans", icon: FolderOpen, active: currentScreen === 'plans', onClick: onNavigatePlans }] : []),
      { label: "Feedback", icon: MessageSquareText, active: currentScreen === 'feedback', onClick: onNavigateFeedback },
      ...(isFeedbackAdmin ? [{ label: "Moderation", icon: ShieldCheck, active: currentScreen === 'moderation', onClick: onNavigateModeration }] : [])
    ]
  }

  return (
    <>
      <header className={cn("fixed top-0 inset-x-0 z-50 h-16 flex px-0 select-none shadow-[0_4px_20px_rgba(217,155,38,0.08)]", className)} {...props}>
        
        {/* Left Side Bar - Flexible width with Golden Touch */}
        <div className="flex-1 h-10 bg-[#FAF6EE] z-20 relative min-w-0 border-b border-[#D99B26]/30">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="#D99B26" strokeOpacity={0.4} strokeWidth={0.75} />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="#D99B26" strokeOpacity={0.2} strokeWidth={0.5} />
          </svg>
        </div>

        {/* Responsive Notch Container - 3 Slices with Golden Touch */}
        <div className="flex h-16 relative z-10 shrink-0 -ml-px">
          
          {/* Left Slice (Corner) */}
          <div className="w-[50px] h-full relative shrink-0">
            {/* Background */}
            <div 
              className="absolute inset-0 bg-[#FAF6EE]" 
              style={{ clipPath: "path('M0 0 H50 V64 C25 64 25 40 0 40 Z')" }} 
            />
            {/* Outlines with Golden Touch */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 50 64">
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="#D99B26" strokeOpacity={0.4} strokeWidth={0.75} />
              <path d="M0 36.5 C25 36.5 25 60.5 50 60.5" fill="none" stroke="#D99B26" strokeOpacity={0.2} strokeWidth={0.5} />
            </svg>
          </div>

          {/* Center Slice (Flexible Content Area) */}
          <div className="flex-1 h-full relative min-w-0 -ml-px">
             {/* Background & Lines Layer */}
             <div className="absolute inset-0 bg-[#FAF6EE] border-b border-[#D99B26]/30">
                 <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                   <line x1="0" y1="63.5" x2="100%" y2="63.5" stroke="#D99B26" strokeOpacity={0.4} strokeWidth={0.75} />
                   <line x1="0" y1="60.5" x2="100%" y2="60.5" stroke="#D99B26" strokeOpacity={0.2} strokeWidth={0.5} />
                 </svg>
             </div>

             {/* Content Layer */}
             <div className="relative w-full h-full flex items-end justify-between pb-2 px-4 md:px-8">
               
               {/* Desktop Left Nav */}
              <nav className="hidden lg:flex gap-7 mb-1 shrink-0 items-center">
                {items.left.map(item => (
                  <NavLink key={item.label} {...item} />
                ))}
              </nav>

              {/* Mobile Menu Button (Left) */}
              <button 
                className="lg:hidden mb-1 p-1 text-foreground/75 hover:text-[#B88628] transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-[#B88628]" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Logo (Center): POWER UP in uppercase, bold, and larger font size */}
              <div className="flex justify-center shrink-0 mx-2 md:mx-6 mt-1 mb-0.5">
                <button 
                  onClick={onNavigateHome}
                  className="flex items-center gap-2.5 group focus:outline-none"
                  aria-label="PowerUp Home"
                >
                  <LogoIcon className="w-7 h-7 text-[#E5A93C] hover:scale-105 transition-transform drop-shadow-[0_0_6px_rgba(229,169,60,0.35)]" />
                  <span className="font-black text-base sm:text-lg tracking-wider text-foreground uppercase flex items-center gap-1">
                    <span>POWER</span>
                    <span className="text-[#E5A93C]">UP</span>
                  </span>
                </button>
              </div>

              {/* Desktop Right Nav */}
              <nav className="hidden lg:flex gap-6 items-center shrink-0 mb-0.5">
                {items.right.map(item => (
                  <NavLink key={item.label} {...item} />
                ))}
                
                <div className="flex gap-4 pl-4 border-l border-[#D99B26]/30 shrink-0 items-center">
                  <button
                    onClick={onStartSetup}
                    className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-black bg-[#E5A93C] hover:bg-[#C99E3B] rounded-2xl transition-all shadow-sm shadow-[#E5A93C]/20 whitespace-nowrap active:scale-95"
                  >
                    Create Plan
                  </button>
                  {isSignedIn ? <>
                    <span className="max-w-28 truncate text-xs font-semibold text-foreground" title={displayName || ''}><UserRound className="mr-1 inline h-3.5 w-3.5" />{displayName || 'Account'}</span>
                    <button onClick={onSignOut} className="text-xs font-semibold text-foreground/70 hover:text-[#B88628]" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
                  </> : <div className="flex items-center gap-3"><button onClick={onAuthAction} className="text-xs font-bold text-[#8C641A] hover:underline">Login</button><button onClick={onSignUp} className="rounded-xl bg-[#E5A93C] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#C99E3B]">Sign Up</button></div>}
                </div>
              </nav>

              {/* Mobile Right Action */}
              <div className="lg:hidden flex items-center gap-2 mb-1">
                <button
                  onClick={onStartSetup}
                  className="px-2.5 py-1 text-[11px] font-bold text-black bg-[#E5A93C] rounded-xl"
                >
                  Create Plan
                </button>
              </div>

             </div>
          </div>

          {/* Right Slice (Corner) */}
          <div className="w-[50px] h-full relative shrink-0 -ml-px">
            {/* Background */}
            <div 
              className="absolute inset-0 bg-[#FAF6EE]" 
              style={{ clipPath: "path('M0 0 H50 V40 C25 40 25 64 0 64 Z')" }} 
            />
            {/* Outlines with Golden Touch */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 50 64">
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="#D99B26" strokeOpacity={0.4} strokeWidth={0.75} />
              <path d="M0 60.5 C25 60.5 25 36.5 50 36.5" fill="none" stroke="#D99B26" strokeOpacity={0.2} strokeWidth={0.5} />
            </svg>
          </div>

        </div>

        {/* Right Side Bar - Flexible width with Golden Touch */}
        <div className="flex-1 h-10 bg-[#FAF6EE] z-20 relative min-w-0 -ml-px border-b border-[#D99B26]/30">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="#D99B26" strokeOpacity={0.4} strokeWidth={0.75} />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="#D99B26" strokeOpacity={0.2} strokeWidth={0.5} />
          </svg>
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
            className="fixed inset-x-0 top-16 z-40 bg-[#FAF6EE] border-b border-[#D99B26]/30 p-4 lg:hidden shadow-xl"
          >
             <nav className="flex flex-col gap-2">
               {[...items.left, ...items.right].map(item => (
                 <button 
                   key={item.label} 
                   className={cn(
                     "flex items-center gap-3 p-3 rounded-lg hover:bg-[#E5A93C]/10 transition-colors text-left",
                     item.active ? "text-[#B88628] font-bold" : "text-foreground/90 font-medium"
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
               {isSignedIn ? <button onClick={() => { setIsMobileMenuOpen(false); onSignOut() }} className="flex items-center gap-3 p-3 text-left font-medium"><LogOut className="h-5 w-5" />Sign out · {displayName || 'Account'}</button> : <div className="flex gap-2"><button onClick={() => { setIsMobileMenuOpen(false); onAuthAction() }} className="flex flex-1 items-center gap-3 rounded-lg p-3 text-left font-medium hover:bg-[#E5A93C]/10"><UserRound className="h-5 w-5" />Login</button><button onClick={() => { setIsMobileMenuOpen(false); onSignUp() }} className="flex flex-1 items-center gap-3 rounded-lg bg-[#E5A93C]/20 p-3 text-left font-semibold hover:bg-[#E5A93C]/30"><UserRound className="h-5 w-5" />Sign Up</button></div>}
               <div className="h-px bg-[#D99B26]/20 my-2" />
               <button 
                 onClick={() => {
                   setIsMobileMenuOpen(false)
                   onStartSetup()
                 }}
                 className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#E5A93C] text-black font-bold uppercase text-xs tracking-wider"
               >
                 <Sparkles className="w-4 h-4" />
                 Create My Backup Plan
               </button>
             </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
