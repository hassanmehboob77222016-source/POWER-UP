import React from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string
}

export const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative w-auto cursor-pointer overflow-hidden rounded-full border border-primary/40 bg-card p-2 px-6 text-center font-semibold text-foreground shadow-sm transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary transition-all duration-300 group-hover:scale-[100] group-hover:opacity-100" />
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0 font-medium tracking-tight">
          {children || text}
        </span>
      </div>
      <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-black opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100">
        <span className="font-semibold tracking-tight">{children || text}</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  )
})

InteractiveHoverButton.displayName = "InteractiveHoverButton"
