import { motion } from 'framer-motion'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import { GridPulse } from '@/components/ui/grid-pulse'
import { ShieldCheck, BatteryMedium, Cpu, LayoutDashboard, Sparkles } from 'lucide-react'

interface HeroSectionProps {
  onStartAdvisor: () => void
  onStartSetup: () => void
  onOpenDashboard: () => void
}

export function HeroSection({ onStartAdvisor, onStartSetup, onOpenDashboard }: HeroSectionProps) {
  return (
    <section id="home" className="relative -mt-16 pt-36 pb-16 md:pt-44 md:pb-24 overflow-hidden">
      <GridPulse className="opacity-90" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(229,169,60,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,206,127,0.08),transparent_28%)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8 text-left"
        >
          <h1 className="max-w-4xl text-foreground leading-[0.96] tracking-tight">
            <span className="block text-[0.7rem] sm:text-sm lg:text-base font-bold uppercase tracking-[0.28em] text-muted-foreground/80">
              Manage Your Backup Power
            </span>
            <span className="mt-4 block text-5xl sm:text-6xl lg:text-[7rem] font-black tracking-[-0.07em] text-primary leading-[0.9]">
              POWER UP
            </span>
            <span className="mt-3 block text-2xl sm:text-3xl lg:text-[2.2rem] font-medium tracking-[-0.04em] text-foreground/90">
              for Load-Shedding.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[56ch]">
            Describe your backup needs to the AI Advisor, confirm the details it finds, then review PowerUp’s input-based estimates.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <InteractiveHoverButton
              onClick={onStartAdvisor}
              className="text-sm sm:text-base px-4 py-2 rounded-3xl bg-primary text-black font-semibold shadow-[0_12px_26px_rgba(96,165,250,0.28)] hover:translate-y-[-1px] hover:shadow-[0_16px_30px_rgba(96,165,250,0.35)] transition-all"
            >
              <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Start AI Advisor</span>
            </InteractiveHoverButton>

            <button
              onClick={onStartSetup}
              className="inline-flex items-center gap-2 text-[0.68rem] sm:text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors px-0 py-0 bg-transparent border-0 shadow-none"
            >
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span>Use manual calculator</span>
            </button>
            <button onClick={onOpenDashboard} className="inline-flex items-center gap-2 text-[0.68rem] sm:text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"><LayoutDashboard className="w-3.5 h-3.5 text-primary" /> Monitoring</button>
          </div>

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/60 max-w-2xl">
            <div className="flex items-center gap-2.5 pt-4">
              <Cpu className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Deterministic Math</span>
            </div>
            <div className="flex items-center gap-2.5 pt-4">
              <BatteryMedium className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">DoD Protection</span>
            </div>
            <div className="flex items-center gap-2.5 pt-4">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Input-based estimates</span>
            </div>
          </div>
        </motion.div>
      </div>

    </section>
  )
}
