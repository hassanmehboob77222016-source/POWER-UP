import LogoIcon from '@/assets/logo/logo-icon'
import { LightLines } from '@/components/home/light-lines'

export type FooterVariant = 'full' | 'minimal' | 'hidden'

interface FooterProps {
  variant?: FooterVariant
}

export function Footer({ variant = 'full' }: FooterProps) {
  if (variant === 'hidden') return null

  const isFull = variant === 'full'

  return (
    <footer className="relative overflow-hidden border-t border-border/80 bg-background py-10 md:py-14">
      <LightLines
        className="opacity-90"
        linesOpacity={0.12}
        lightsOpacity={0.9}
        speedMultiplier={1.25}
        gradientFrom="#FBFBFD"
        gradientTo="#F7F3E8"
        lightColor="#E5A93C"
        lineColor="#E5A93C"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(229,169,60,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(229,169,60,0.08),transparent_26%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {isFull ? (
          <>
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
              <div className="flex items-center gap-3" data-grid-avoid>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5A93C]/40 bg-background/80 shadow-[0_10px_24px_rgba(229,169,60,0.12)] backdrop-blur-sm">
                  <LogoIcon className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <span className="block text-lg font-semibold tracking-[-0.04em] text-foreground">
                    Power<span className="text-[#E5A93C]">Up</span>
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Backup Power Planner
                  </span>
                </div>
              </div>

              <nav className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground md:justify-end" aria-label="Footer navigation">
                <a href="#home" className="transition hover:text-foreground">Home</a>
                <a href="#calculator" className="transition hover:text-foreground">Calculator</a>
                <a href="#monitoring" className="transition hover:text-foreground">Monitoring</a>
                <a href="#plans" className="transition hover:text-foreground">Plans</a>
              </nav>
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/80 pt-4 text-[11px] text-muted-foreground md:flex-row">
              <p>© {new Date().getFullYear()} PowerUp. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span className="transition hover:text-foreground">Privacy</span>
                <span className="transition hover:text-foreground">Terms</span>
                <span className="transition hover:text-foreground">Support</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-between gap-4 text-[11px] text-muted-foreground md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5A93C]/40 bg-background/80 shadow-sm backdrop-blur-sm">
                <LogoIcon className="h-5 w-5 text-foreground" />
              </div>
              <span className="font-medium text-foreground">
                Power<span className="text-[#E5A93C]">Up</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="transition hover:text-foreground">Privacy</span>
              <span className="transition hover:text-foreground">Terms</span>
              <span className="transition hover:text-foreground">Support</span>
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
