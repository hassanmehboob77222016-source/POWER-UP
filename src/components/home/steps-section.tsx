import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BatteryCharging, ListChecks, CalendarClock, ArrowRight, CheckCircle2 } from 'lucide-react'

interface StepsSectionProps {
  onStartSetup: () => void
}

export function StepsSection({ onStartSetup }: StepsSectionProps) {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      number: "01",
      title: "Inventory Your Power Setup",
      shortDesc: "Tell PowerUp your backup type and battery specs (or choose 'unknown' if unsure).",
      icon: BatteryCharging,
      details: [
        "Select Inverter, Solar + Battery, or Portable Station",
        "Set chemistry (LiFePO4, AGM, Tubular Lead-Acid)",
        "Input Amp-hours & Voltage or direct kWh capacity"
      ],
      previewGraphic: (
        <div className="p-5 rounded-2xl bg-card border border-border space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-muted-foreground">System Identified:</span>
            <span className="text-primary font-bold">48V 100Ah LiFePO4</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Nominal Capacity:</span>
            <span className="text-foreground">4,800 Watt-Hours</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Safe Usable Energy (90% DoD × 85% η):</span>
            <span className="text-emerald-500 font-semibold">3,672 Wh Usable</span>
          </div>
        </div>
      )
    },
    {
      number: "02",
      title: "Tag Essential Appliances",
      shortDesc: "Pick the devices your household needs to stay connected, fed, and comfortable.",
      icon: ListChecks,
      details: [
        "Pick from pre-calibrated household appliances",
        "Automatic separation of continuous vs intermittent loads",
        "Surge flagging for compressor and pump motors"
      ],
      previewGraphic: (
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border">
            <span className="font-medium text-foreground">Wi-Fi Fiber Router</span>
            <span className="font-mono text-primary font-bold">12W (Priority 1)</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border">
            <span className="font-medium text-foreground">Inverter Refrigerator</span>
            <span className="font-mono text-amber-500 font-bold">120W (Cycled 40%)</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border">
            <span className="font-medium text-foreground">Work Laptop (x2)</span>
            <span className="font-mono text-foreground font-bold">110W Continuous</span>
          </div>
        </div>
      )
    },
    {
      number: "03",
      title: "Get Your AI Survival Plan",
      shortDesc: "Receive real deterministic runtimes, duty-cycle schedules, and outage advice.",
      icon: CalendarClock,
      details: [
        "Deterministic mathematical runtime prediction",
        "Tactical duty-cycle schedule to stretch battery hours",
        "One-click copy to clipboard for household sharing"
      ],
      previewGraphic: (
        <div className="p-5 rounded-2xl bg-card border border-primary/30 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">Outage Survival Forecast:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-bold">
              +1.8h Surplus
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '78%' }} />
          </div>
          <p className="text-[11px] text-muted-foreground leading-normal">
            "Your 4-hour outage is covered. By cycling the fridge, you preserve 32% reserve buffer for emergency lighting."
          </p>
        </div>
      )
    }
  ]

  return (
    <section id="how-it-works" className="py-20 bg-surface/50 border-y border-border/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl text-left mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            How PowerUp Works in Three Simple Steps
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            From technical battery limits to household comfort — designed to prevent unexpected blackouts.
          </p>
        </div>

        {/* 3 Step Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Step Selector Cards */}
          <div className="lg:col-span-6 space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon
              const isSelected = activeStep === idx

              return (
                <div
                  key={step.number}
                  onClick={() => setActiveStep(idx)}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all text-left ${
                    isSelected 
                      ? 'bg-card border-primary/60 shadow-lg shadow-primary/5 ring-1 ring-primary/30' 
                      : 'bg-card/40 border-border hover:bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`text-sm font-mono font-bold px-2.5 py-1 rounded-lg ${
                      isSelected ? 'bg-primary text-black' : 'bg-surface text-muted-foreground'
                    }`}>
                      {step.number}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h3 className="text-base font-bold text-foreground">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {step.shortDesc}
                      </p>

                      {isSelected && (
                        <motion.ul 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 space-y-1.5 pt-2 border-t border-border/60"
                        >
                          {step.details.map((detail, dIdx) => (
                            <li key={dIdx} className="flex items-center gap-2 text-xs text-foreground/80">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Interactive Step Preview Panel */}
          <div className="lg:col-span-6">
            <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card/80 backdrop-blur-md shadow-xl text-left relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/80">
                <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                  Step {steps[activeStep].number} Interactive Simulation
                </span>
                <span className="text-xs font-semibold text-primary flex items-center gap-1">
                  Live Preview <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  {steps[activeStep].previewGraphic}
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 pt-5 border-t border-border/80 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Ready to test your home?</span>
                <button
                  onClick={onStartSetup}
                  className="px-4 py-2 rounded-xl bg-primary text-black text-xs font-bold hover:bg-primary-hover transition-colors shadow-sm"
                >
                  Start Setup Now
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
