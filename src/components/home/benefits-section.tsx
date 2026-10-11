import React from 'react'
import { ShieldAlert, Zap, Clock, Cpu } from 'lucide-react'

export function BenefitsSection() {
  const benefits = [
    {
      icon: ShieldAlert,
      title: "Extends Battery Lifespan",
      desc: "Discharging lead-acid or lithium batteries to 0% permanently reduces cycle life. PowerUp enforces depth-of-discharge boundaries.",
      badge: "Battery Health"
    },
    {
      icon: Clock,
      title: "Zero Work Interruptions",
      desc: "Keeps Wi-Fi routers and remote workstations powered without draining the system on high-draw kitchen or space heating loads.",
      badge: "Connectivity"
    },
    {
      icon: Cpu,
      title: "Honest, Deterministic Physics",
      desc: "No hallucinated battery times. Every hour and minute is derived from exact Watt-Hour conversions and verified inverter losses.",
      badge: "Accuracy"
    }
  ]

  return (
    <section id="benefits" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl text-left mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Engineered for Real Load-Shedding Resilience
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Practical household backup management built to survive severe outages without damaging equipment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {benefits.map((item, idx) => {
          const Icon = item.icon
          return (
            <div 
              key={idx} 
              className="p-6 rounded-3xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-surface px-2.5 py-1 rounded-full border border-border">
                  {item.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
