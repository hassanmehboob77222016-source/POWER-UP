import React from 'react'
import { motion } from 'framer-motion'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import { ShieldCheck, BatteryMedium, Cpu, LayoutDashboard, ArrowRight } from 'lucide-react'

interface HeroSectionProps {
  onStartSetup: () => void
  onOpenDashboard: () => void
}

export function HeroSection({ onStartSetup, onOpenDashboard }: HeroSectionProps) {
  return (
    <section id="home" className="relative pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
      {/* Background Animated Subtle Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-left"
        >
          {/* Eyebrow Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold tracking-wide uppercase">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            Theme: Power, Water, Heat — Hackathon
          </div>

          {/* Restored Original Headline & Fonts with Typography.png Italic Accent */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.08] max-w-4xl">
            Manage Your Backup Power for{' '}
            <span className="italic font-serif font-normal text-primary tracking-normal">
              Load-Shedding.
            </span>
          </h1>

          {/* Restored Original Subtitle Copy */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[56ch]">
            PowerUp calculates exact battery runtimes, prevents deep discharge damage, and delivers an AI schedule so your essential appliances survive the blackout.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <InteractiveHoverButton
              onClick={onStartSetup}
              className="text-sm py-3 px-7 bg-primary text-black font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02]"
            >
              Create My Backup Plan
            </InteractiveHoverButton>

            <button
              onClick={onOpenDashboard}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-4 py-3 rounded-full border border-border bg-card hover:bg-surface shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
              <span>View Unit Monitoring Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Restored Original Trust Badges */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/60 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Deterministic Math</span>
            </div>
            <div className="flex items-center gap-2.5">
              <BatteryMedium className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">DoD Protection</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Zero Hallucinations</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
