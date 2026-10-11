import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

const tracks = [
  { x: 70, width: 4.5, direction: "up", duration: 18, delay: -3, segments: [0, 55, 201, 512] },
  { x: 124, width: 0.9, direction: "down", duration: 23, delay: -11, segments: [185, 505] },
  { x: 300, width: 4.6, direction: "up", duration: 16, delay: -7, segments: [0, 380, 765, 969] },
  { x: 328, width: 1.8, direction: "down", duration: 21, delay: -15, segments: [55, 170, 435] },
  { x: 455, width: 1.8, direction: "up", duration: 19, delay: -4, segments: [398, 508, 992] },
  { x: 615, width: 4.5, direction: "down", duration: 17, delay: -12, segments: [55, 135, 298, 675] },
  { x: 684, width: 1.8, direction: "down", duration: 22, delay: -8, segments: [823, 928, 1044] },
  { x: 873, width: 1.8, direction: "down", duration: 20, delay: -2, segments: [0, 50, 124, 289] },
  { x: 1100, width: 1.8, direction: "down", duration: 24, delay: -18, segments: [851, 874, 984, 1076] },
  { x: 1233, width: 0.9, direction: "down", duration: 17, delay: -6, segments: [568, 733, 893] },
  { x: 1253, width: 4.5, direction: "up", duration: 21, delay: -14, segments: [0, 252, 498, 532] },
  { x: 1310, width: 0.9, direction: "down", duration: 19, delay: -9, segments: [48, 378, 698] },
  { x: 1369, width: 1.8, direction: "down", duration: 23, delay: -5, segments: [655, 829, 1020] },
  { x: 1547, width: 4.5, direction: "down", duration: 18, delay: -16, segments: [520, 533, 826, 991] },
  { x: 1618, width: 1.8, direction: "down", duration: 22, delay: -10, segments: [0, 81, 200, 469] },
  { x: 1666, width: 0.9, direction: "up", duration: 20, delay: -1, segments: [331, 602, 898] },
  { x: 1818, width: 4.5, direction: "up", duration: 24, delay: -13, segments: [0, 55, 170, 435] }
]

interface LightLinesProps {
  className?: string
  linesOpacity?: number
  lightsOpacity?: number
  speedMultiplier?: number
  gradientFrom?: string
  gradientTo?: string
  lightColor?: string
  lineColor?: string
}

export function LightLines({
  className,
  linesOpacity = 0.1,
  lightsOpacity = 0.65,
  speedMultiplier = 1,
  gradientFrom = 'rgba(229,169,60,0.045)',
  gradientTo = 'transparent',
  lightColor = '#E5A93C',
  lineColor = '#B88628',
}: LightLinesProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 -top-16 bottom-0 overflow-hidden',
        className
      )}
      style={{
        background: `linear-gradient(180deg, ${gradientFrom}, ${gradientTo} 70%)`,
      }}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <g fill={lineColor} opacity={linesOpacity}>
          {tracks.map(({ x, width }) => (
            <rect key={`line-${x}`} x={x} width={width} height="1080" />
          ))}
        </g>
        <g fill={lightColor} opacity={lightsOpacity}>
          {tracks.map(({ x, width, direction, duration, delay, segments }) => (
            <g
              key={`light-${x}`}
              className={`hero-light-track hero-light-track-${direction}`}
              style={{
                '--light-duration': `${duration / speedMultiplier}s`,
                '--light-delay': `${delay / speedMultiplier}s`,
              } as CSSProperties}
            >
              {segments.map((y, index) => (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width={width}
                  height={index % 2 === 0 ? 24 : 10}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
