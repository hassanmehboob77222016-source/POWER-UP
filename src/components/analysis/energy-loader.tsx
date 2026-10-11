import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Cpu, BatteryMedium, Sparkles } from 'lucide-react'

interface EnergyLoaderProps {
  onCancel?: () => void
}

export function EnergyLoader({ onCancel }: EnergyLoaderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const steps = [
    { title: "Aggregating Appliance Loads", desc: "Verifying nominal wattages & compressor inrush surges..." },
    { title: "Computing Depth-of-Discharge", desc: "Applying chemistry cutoff limits and 85% inverter conversion..." },
    { title: "Synthesizing AI Survival Plan", desc: "Structuring duty-cycle intervals for load-shedding hours..." }
  ]

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStepIndex(1), 600)
    const timer2 = setTimeout(() => setCurrentStepIndex(2), 1200)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      {/* Central Pulsing Energy Core */}
      <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
        {/* Concentric expanding ripples */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75" />
        <div className="absolute -inset-3 rounded-full border border-primary/30 animate-spin [animation-duration:8s]" />
        
        {/* Core sphere */}
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-primary to-amber-300 p-0.5 shadow-xl shadow-primary/25 flex items-center justify-center text-black">
          <Zap className="w-10 h-10 animate-bounce text-black" />
        </div>
      </div>

      <h3 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">
        Analyzing Backup Capacity
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
        Running deterministic electrical formulas & AI load-shedding coach...
      </p>

      {/* Progressive Step Status Bar */}
      <div className="space-y-3 max-w-sm mx-auto text-left bg-card border border-border p-4 rounded-2xl shadow-sm">
        {steps.map((step, idx) => {
          const isDone = currentStepIndex > idx
          const isCurrent = currentStepIndex === idx

          return (
            <div key={idx} className="flex items-start gap-3 text-xs">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] font-bold ${
                isDone 
                  ? 'bg-emerald-500 text-black' 
                  : isCurrent 
                  ? 'bg-primary text-black animate-pulse' 
                  : 'bg-surface text-muted-foreground'
              }`}>
                {isDone ? '✓' : idx + 1}
              </div>
              <div>
                <div className={`font-bold ${isCurrent ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {step.desc}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {onCancel && (
        <div className="mt-8">
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Cancel & Edit Setup
          </button>
        </div>
      )}
    </div>
  )
}
