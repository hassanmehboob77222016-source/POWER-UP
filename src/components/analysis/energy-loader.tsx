import { useEffect, useState } from 'react'

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
      <div className="relative mx-auto mb-8 flex h-24 w-32 items-center justify-center">
        <div className="powerup-loader" aria-label="Loading backup analysis" role="status" />
      </div>

      <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-foreground">
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
