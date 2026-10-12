import React from 'react'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

export default function LogoIcon({
  className = 'h-6 w-6',
  style,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        maskImage: "url('/powerup-logo.png')",
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        maskSize: 'contain',
        WebkitMaskImage: "url('/powerup-logo.png')",
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        ...style
      } as CSSProperties}
      {...props}
    />
  )
}
