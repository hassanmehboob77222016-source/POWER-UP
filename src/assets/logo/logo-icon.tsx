import React from 'react'

export default function LogoIcon({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="28" height="28" rx="7" fill="currentColor" fillOpacity="0.1" />
      <path
        d="M15.5 4.5L7 15.5H14L12.5 23.5L21 12.5H14L15.5 4.5Z"
        fill="url(#powerup-gradient)"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="powerup-gradient" x1="7" y1="4.5" x2="21" y2="23.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5B041" />
          <stop offset="1" stopColor="#E5A93C" />
        </linearGradient>
      </defs>
    </svg>
  )
}
