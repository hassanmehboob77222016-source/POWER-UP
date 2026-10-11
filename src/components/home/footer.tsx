import React from 'react'
import LogoIcon from '@/assets/logo/logo-icon'

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-surface/80 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoIcon className="w-6 h-6 text-foreground" />
            <span className="font-bold text-sm tracking-tight text-foreground">
              Power<span className="text-primary">Up</span>
            </span>
            <span className="text-xs text-muted-foreground border-l border-border pl-3">
              Power, Water, Heat — Hackathon
            </span>
          </div>

          <p className="text-xs text-muted-foreground text-center md:text-right">
            Deterministic calculations provide guidance only. Always follow certified electrician safety protocols.
          </p>
        </div>
      </div>
    </footer>
  )
}
