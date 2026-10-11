import React from 'react'
import { Zap, Sun, BatteryCharging, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'

export function IsometricHouse() {
  return (
    <div className="relative w-full max-w-[540px] mx-auto rounded-3xl border border-border bg-card/60 backdrop-blur-xl p-6 shadow-2xl overflow-hidden group">
      {/* Background ambient solar glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header bar with live pulse status */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              Live Microgrid Simulation
            </h4>
            <p className="text-[11px] text-muted-foreground font-mono">Load-Shedding Active • Mode: Battery Safe</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
            <BatteryCharging className="w-3 h-3" />
            76% Reserve
          </span>
        </div>
      </div>

      {/* Isometric SVG Illustration */}
      <div className="relative aspect-[16/10] w-full flex items-center justify-center">
        <svg viewBox="0 0 500 320" className="w-full h-full drop-shadow-md select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground Platform */}
          <path d="M250 20 L470 145 L250 270 L30 145 Z" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
          <path d="M30 145 L250 270 V290 L30 165 Z" fill="currentColor" fillOpacity="0.06" />
          <path d="M470 145 L250 270 V290 L470 165 Z" fill="currentColor" fillOpacity="0.08" />

          {/* Grid lines on base */}
          <path d="M140 82 L360 207 M85 113 L305 238 M195 51 L415 176" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" strokeDasharray="4 4" />

          {/* Main House Base */}
          {/* Left Wall */}
          <path d="M170 135 L250 180 V235 L170 190 Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
          {/* Right Wall */}
          <path d="M250 180 L330 135 V190 L250 235 Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />

          {/* Windows on left wall */}
          <path d="M185 152 L205 163 V178 L185 167 Z" fill="#E5A93C" fillOpacity="0.6" className="animate-pulse" />
          <path d="M215 168 L235 179 V194 L215 183 Z" fill="#E5A93C" fillOpacity="0.4" />

          {/* House Roof Left & Right */}
          <path d="M250 95 L170 135 L250 180 L330 135 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2" />

          {/* Solar Panels on Roof (Vibrant Amber / Solar Grid) */}
          <path d="M245 105 L190 135 L230 157 L285 127 Z" fill="#1B1D2A" stroke="#E5A93C" strokeWidth="1.5" />
          {/* Panel Cells */}
          <path d="M217 120 L257 142 M204 127 L244 149 M231 113 L271 135" stroke="#E5A93C" strokeOpacity="0.7" strokeWidth="1" />
          <path d="M210 146 L265 116 M265 116 L265 116" stroke="#E5A93C" strokeOpacity="0.4" strokeWidth="1" />

          {/* External Battery Unit Box */}
          <path d="M110 155 L145 175 V205 L110 185 Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
          <path d="M145 175 L170 160 V190 L145 205 Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
          <path d="M110 155 L135 140 L160 155 L135 170 Z" fill="#E5A93C" fillOpacity="0.2" stroke="#E5A93C" strokeWidth="1" />
          
          {/* Battery Status LED */}
          <circle cx="128" cy="183" r="3" fill="#10B981" />
          <circle cx="138" cy="188" r="3" fill="#E5A93C" />

          {/* Power Flow Lines from Solar & Battery into House */}
          <path d="M150 170 Q 180 185 210 175" stroke="#E5A93C" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" className="animate-[dash_1s_linear_infinite]" />
          <path d="M240 160 Q 250 180 250 200" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />

          {/* Outage Shield Icon floating above */}
          <g transform="translate(370, 75)">
            <circle cx="0" cy="0" r="24" fill="#E5A93C" fillOpacity="0.15" stroke="#E5A93C" strokeWidth="1" />
            <path d="M-6 -6 L6 6 M-6 6 L6 -6" stroke="#E5A93C" strokeWidth="2" strokeLinecap="round" />
            <path d="M0 -10 V10" stroke="#E5A93C" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>

        {/* Floating Interactive Badge (like dashboard.jpeg's "Unit 05" card) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute -bottom-2 -left-2 bg-card/95 border border-border/80 rounded-2xl p-3.5 shadow-xl backdrop-blur-md max-w-[210px]"
        >
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-primary" />
              Unit 01: Storage
            </span>
            <span className="text-[10px] font-mono text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">Optimal</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex justify-between">
            <span>Active Load:</span>
            <span className="font-mono font-medium text-foreground">340W</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex justify-between">
            <span>Projected:</span>
            <span className="font-mono font-semibold text-primary">5.2 Hours</span>
          </div>
        </motion.div>

        {/* Floating Right Detail Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute top-2 -right-2 bg-card/95 border border-border/80 rounded-2xl p-3 shadow-xl backdrop-blur-md max-w-[190px]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Duty-Cycle Active
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Fridge scheduled 40m/hr • Preserving 680Wh reserve
          </p>
        </motion.div>
      </div>

      {/* Bottom quick readout footer */}
      <div className="grid grid-cols-3 gap-2 pt-4 mt-3 border-t border-border/80 text-center">
        <div className="bg-surface rounded-xl p-2">
          <span className="text-[10px] text-muted-foreground block uppercase font-mono">DoD Safety</span>
          <span className="text-xs font-bold text-emerald-500">90% Cap</span>
        </div>
        <div className="bg-surface rounded-xl p-2">
          <span className="text-[10px] text-muted-foreground block uppercase font-mono">Inverter Loss</span>
          <span className="text-xs font-bold text-foreground">15% Factored</span>
        </div>
        <div className="bg-surface rounded-xl p-2">
          <span className="text-[10px] text-muted-foreground block uppercase font-mono">Surge Guard</span>
          <span className="text-xs font-bold text-primary">Active</span>
        </div>
      </div>
    </div>
  )
}
