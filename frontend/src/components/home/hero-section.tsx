import { motion } from 'framer-motion'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import { GridPulse } from '@/components/ui/grid-pulse'
import { Cpu, LayoutDashboard, Sparkles } from 'lucide-react'

interface HeroSectionProps {
  onStartAdvisor: () => void
  onStartSetup: () => void
  onOpenDashboard: () => void
}

export function HeroSection({ onStartAdvisor, onStartSetup, onOpenDashboard }: HeroSectionProps) {
  return (
    <section id="home" className="relative -mt-16 pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
      <GridPulse className="opacity-90" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(229,169,60,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,206,127,0.08),transparent_28%)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8 text-left"
        >
          <h1 className="text-foreground">
            <span className="block text-[0.7rem] sm:text-sm lg:text-base font-bold uppercase tracking-[0.28em] text-muted-foreground/80">
              PowerUp · Load-shedding planner
            </span>
            <span className="mt-4 block text-6xl sm:text-7xl lg:text-[7.5rem] font-black uppercase tracking-[-0.07em] leading-[0.88]">
              How long
            </span>
            <span className="block text-6xl sm:text-7xl lg:text-[7.5rem] font-black uppercase tracking-[-0.07em] leading-[0.88] text-primary">
              will it last?
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground leading-snug max-w-[34ch]">
            Enter your battery and appliances. Get the hours, with the math shown.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <InteractiveHoverButton
              onClick={onStartAdvisor}
              className="text-sm sm:text-base px-4 py-2 rounded-3xl bg-primary text-black font-semibold shadow-[0_12px_26px_rgba(229,169,60,0.28)] hover:translate-y-[-1px] hover:shadow-[0_16px_30px_rgba(229,169,60,0.35)] transition-all"
            >
              <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Ask AI</span>
            </InteractiveHoverButton>

            <button
              onClick={onStartSetup}
              className="inline-flex items-center gap-2 text-[0.68rem] sm:text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span>Use manual calculator</span>
            </button>

            <button
              onClick={onOpenDashboard}
              className="inline-flex items-center gap-2 text-[0.68rem] sm:text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
              <span>Monitoring</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}