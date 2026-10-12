# PowerUp — Design System

## 1. Project Overview

**Project:** PowerUp
**Product:** Backup Power Planner
**Theme:** Power, Water, Heat — Hackathon  
**Primary problem:** Helping households manage their available backup power during load-shedding.

PowerUp helps households understand their backup limitations, prioritize essential appliances, and receive personalized recommendations for managing power outages.

The interface should feel trustworthy, practical, modern, friendly, and easy to understand.

## 2. Design Reference Files

### Dashboard Reference
File: `design-references/dashboard.jpeg`

Use this screenshot as inspiration for the results/dashboard screen, including its layout, information hierarchy, cards, spacing, and visual organization.

Adapt the design to PowerUp's actual purpose. Do not copy unrelated elements or reproduce the reference website exactly.

### Color Scheme Reference
File: `design-references/color-pallete.jpeg`

Use this screenshot as the primary reference for the application's color palette.

Before implementation, identify the main background, surface, primary, accent, text, and muted colors. Record their approximate or sampled HEX values in the implementation plan.

Do not invent a completely different palette. Maintain consistent color usage throughout the application.

## 3. Visual Direction

Create a polished energy-tech experience that feels like a real, thoughtfully designed product.

Priorities:
- Clear visual hierarchy.
- Consistent spacing and alignment.
- Readable typography.
- Clean, well-structured information.
- Carefully designed buttons, forms, and cards.
- Subtle depth and restrained animation.
- Strong contrast and accessible interactions.

Avoid generic templated layouts, excessive gradients, excessive glassmorphism, repetitive cards, unnecessary decorations, and oversized dashboards filled with meaningless statistics.

## 4. Main User Journey

The application should follow this flow:

Home → Backup Setup → Calculated Backup Plan

### Screen 1: Home
- Introduce PowerUp.
- Explain the problem it solves with animated text and animated background grid .
- Include a clear "Create My Backup Plan" CTA.
- Show a relevant visual representing a home, backup battery, or essential appliances.
- Explain the process in three simple steps using an animated visual.
- Include a concise benefits section and footer.

### Screen 2: Backup Setup
Collect the information required to understand the user's situation:
- Backup type: UPS/inverter, solar with battery, generator, or no backup.
- Battery details, when known.
- Typical outage duration.
- Essential appliances.
- Household priorities and usage constraints.

Distinguish required and optional fields. Allow users to continue when certain technical specifications are unknown.

### Screen 3: Personalized Backup Plan
- Show a summary of the user's situation.
- Present prioritized appliance recommendations.
- Explain why the recommendations may help.
- Display runtime estimates only when sufficient, reliable inputs are available.
- Clearly show assumptions and missing information.
- Include actions to edit answers and copy the plan.

## 5. Color Tokens

Extracted and calibrated from `design-references/color-pallete.jpeg`:

- Background: Light `#FBFBFD` / Dark `#0E0E12`
- Surface/card: Light `#FFFFFF` / Dark `#16161D` (subtle warm tone `#FDF9F2` in light accent areas)
- Primary (Solar Amber): `#E5A93C` (Warm golden energy, hover `#C99E3B`)
- Accent (Deep Bronze / Solar Gold): `#D97706` / `#F59E0B` (Accent glow `#FDE692`)
- Main text: Light `#111116` / Dark `#F4F4F6`
- Secondary text: Light `#5A5A68` / Dark `#9A9AA6`
- Border: Light `#E8E8EE` / Dark `#272732` (gold highlight border `#E5A93C33`)
- Success: `#10B981` (Emerald Battery / Normal Grid)
- Warning: `#F59E0B` (Solar Inverter Warning / High Draw)
- Error: `#EF4444` (Outage Overload / Critical Battery)

Check text contrast and use the same colors consistently across all screens.

## 6. Typography and Spacing

Use typography and spacing similar to the design reference `design-references/dashboard.jpeg`.

## 7. Components

Create reusable components for:
- Navigation - Use this navigation code to recreate the nevigation of Power UP.
"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowUpRight, Home, User, Calendar, Zap, CreditCard, Menu, X, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import LogoIcon from '@/assets/logo/logo-icon'
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"

// Helper component for navigation links
const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) => (
  <Link 
    href={href} 
    className="group flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap"
  >
    <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
    <span>{label}</span>
  </Link>
)

// Simple Theme Toggle for Mobile
const MobileThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="w-9 h-9" />

  const isDark = (theme === 'dark' || resolvedTheme === 'dark')

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-foreground/5 transition-colors text-foreground/70 hover:text-foreground"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

export function NotchNavbar({ className, ...props }: React.HTMLAttributes<HTMLElement> & { logo?: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Navigation items configuration
  const items = {
    left: [
      { label: "Home", href: "#home", icon: Home },
      { label: "About", href: "#about", icon: User },
      { label: "Events", href: "#events", icon: Calendar }
    ],
    right: [
      { label: "Sponsors", href: "#sponsors", icon: Zap },
      { label: "Pricing", href: "#pricing", icon: CreditCard }
    ]
  }

  return (
    <>
      <header className={cn("fixed top-0 inset-x-0 z-50 h-16 flex px-0", className)} {...props}>
        
        {/* Left Side Bar - Flexible width */}
        <div className="flex-1 h-10 bg-zinc-50 dark:bg-black z-20 relative min-w-0">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
          </svg>
        </div>

        {/* Responsive Notch Container - 3 Slices */}
        <div className="flex h-16 relative z-10 shrink-0 -ml-px">
          
          {/* Left Slice (Corner) */}
          <div className="w-[50px] h-full relative shrink-0">
            {/* Glass Background */}
            <div className="absolute inset-0 bg-zinc-50 dark:bg-black" style={{ clipPath: "path('M0 0 H50 V64 C25 64 25 40 0 40 Z')" }} />
            {/* Outlines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 50 64">
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
              <path d="M0 36.5 C25 36.5 25 60.5 50 60.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            </svg>
          </div>

          {/* Center Slice (Flexible Content Area) */}
          <div className="flex-1 h-full relative min-w-0 -ml-px">
             {/* Background & Lines Layer */}
             <div className="absolute inset-0 bg-zinc-50 dark:bg-black">
                 <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                   <line x1="0" y1="63.5" x2="100%" y2="63.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
                   <line x1="0" y1="60.5" x2="100%" y2="60.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
                 </svg>
             </div>

             {/* Content Layer */}
             <div className="relative w-full h-full flex items-end justify-between pb-2 px-4 md:px-8">
               
               {/* Desktop Left Nav */}
               <nav className="hidden md:flex gap-8 mb-1 shrink-0">
                {items.left.map(item => (
                  <NavLink key={item.label} {...item} />
                ))}
              </nav>

              {/* Mobile Menu Button (Left) */}
              <button 
                className="md:hidden mb-1 p-1 text-foreground/70 hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Logo (Center) */}
              <div className="flex justify-center shrink-0 mx-2 md:mx-4 mt-1">
                {props.logo || (
                  <Link href="/" className="flex items-center justify-center relative group">
                    <LogoIcon className="w-7 h-7 text-foreground rotate-180 hover:scale-105 transition-transform relative z-10" />
                  </Link>
                )}
              </div>

              {/* Desktop Right Nav */}
              <nav className="hidden md:flex gap-6 items-center shrink-0">
                {items.right.map(item => (
                  <NavLink key={item.label} {...item} />
                ))}
                
                <div className="flex gap-4 pl-4 border-l border-foreground/10 shrink-0 items-center">
                  <ThemeToggle />
                  <Link href="/login" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap">
                    Log in
                  </Link>
                  <Link href="/signup" className="px-3 py-1.5 text-sm font-medium text-background bg-foreground rounded-2xl hover:bg-foreground/90 transition-colors shadow-sm shadow-foreground/10 whitespace-nowrap">
                    Sign up
                  </Link>
                </div>
              </nav>

              {/* Mobile Right Actions */}
              <div className="md:hidden flex items-center gap-2 mb-1">
                <MobileThemeToggle />
              </div>

             </div>
          </div>

          {/* Right Slice (Corner) */}
          <div className="w-[50px] h-full relative shrink-0 -ml-px">
            {/* Glass Background */}
            <div className="absolute inset-0 bg-zinc-50 dark:bg-black" style={{ clipPath: "path('M0 0 H50 V40 C25 40 25 64 0 64 Z')" }} />
            {/* Outlines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 50 64">
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
              <path d="M0 60.5 C25 60.5 25 36.5 50 36.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            </svg>
          </div>

        </div>

        {/* Right Side Bar - Flexible width */}
        <div className="flex-1 h-10 bg-zinc-50 dark:bg-black z-20 relative min-w-0 -ml-px">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
          </svg>
        </div>

      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 bg-zinc-50 dark:bg-black border-b border-foreground/5 p-4 md:hidden shadow-lg"
          >
             <nav className="flex flex-col gap-2">
               {/* Combine all items */}
               {[...items.left, ...items.right].map(item => (
                 <Link 
                   key={item.label} 
                   href={item.href}
                   className="flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors"
                   onClick={() => setIsMobileMenuOpen(false)}
                 >
                   <item.icon className="w-5 h-5 opacity-70" />
                   <span className="font-medium text-foreground/90">{item.label}</span>
                 </Link>
               ))}
               <div className="h-px bg-foreground/10 my-2" />
               <div className="flex flex-col gap-2">
                 <Link 
                    href="/login" 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors font-medium text-foreground/90"
                    onClick={() => setIsMobileMenuOpen(false)}
                 >
                   Log in
                 </Link>
                 <Link 
                    href="/signup" 
                    className="flex items-center justify-center gap-2 p-3 rounded-lg bg-foreground text-background font-medium mt-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                 >
                   Sign up
                 </Link>
               </div>
             </nav>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
Button- Use this code to recreate buttons
import { InteractiveHoverButton } from "@/registry/magicui/interactive-hover-button"

export function InteractiveHoverButtonDemo() {
  return <InteractiveHoverButton>Hover Me</InteractiveHoverButton>
}

- Input fields, checkboxes, and selection cards.
- Appliance selection.
- Progress and loading indicators.
- Recommendation cards.
- Status badges and warnings.
- Empty, error, and success states.
- The results dashboard.

Keep component styling consistent across the application.

## 8. Interactions and Animation

Use subtle, purposeful interactions:
- Button hover, focus, and pressed states.
- Gentle card hover effects.
- Smooth transitions between steps.
- Scroll-triggered reveals where they improve the page.
- A clear progress indication when a calculation takes time.

Use CSS and existing UI components for depth, gradients, and animations.

Do not use Three.js, WebGL, React Three Fiber, or actual 3D models.

Animations must not block user interactions or reduce readability.

## 9. Functional Requirements

Every visible control must work.

- The home CTA opens the setup form.
- Form inputs update correctly.
- Required fields are validated.
- Submitting the form invokes the PowerUp calculation engine.
- Progress states reflect real processing.
- Results are based on the user's inputs.
- Users can edit their answers and generate a revised plan.
- Errors are handled clearly.
- Copy Plan performs a real copy action.

Clearly identify sample data used for demonstrations.

## 10. Accuracy and Safety

Do not fabricate battery capacity, appliance wattage, runtime estimates, electricity savings, or outage predictions.

Use deterministic application code for numerical calculations and rule-based logic for recommendations.

When technical details are missing, explain the limitation instead of presenting an unsupported estimate.

Do not give instructions for unsafe electrical wiring, battery repair, or equipment modification.

## 11. Responsive Design

Support desktop, tablet, and mobile screens.

Keep controls touch-friendly and prevent horizontal overflow. On mobile, stack cards and form fields logically while preserving the same color system and visual hierarchy.

Respect keyboard navigation, visible focus indicators, readable contrast, and reduced-motion preferences.

## 12. Technical Constraints

- Preserve the existing project structure where possible.
- Use the project's existing React, Vite, and Tailwind CSS setup.
- Inspect installed dependencies before adding new packages.
- Keep API credentials on the server side.
- Prefer reusable components and straightforward code.
- Do not introduce unnecessary dependencies or Three.js.

## 13. Implementation Order

1. Inspect the project and reference screenshots.
2. Confirm the extracted palette and proposed screen structure.
3. Build the core user journey and form.
4. Implement calculation and result handling.
5. Add supported recommendation logic.
6. Apply the design system consistently.
7. Add animations and visual polish.
8. Test functionality, responsiveness, and error states.

## 14. Completion Criteria

The application should:
- Look consistent with the selected references.
- Have a coherent home page, form, and results screen.
- Provide meaningful personalized recommendations.
- Avoid false or unsupported technical estimates.
- Work on desktop and mobile.
- Have no dead buttons or major console errors.
- Be easy to demonstrate to hackathon judges.
