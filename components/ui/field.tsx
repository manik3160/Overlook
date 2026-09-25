import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Inputs (DESIGN.md 7.2): visible labels always; native <select> so the GET search form works without JS.
export const inputCls = "h-9 w-full rounded-sm border border-line-strong bg-surface-2 px-3 text-sm text-fg outline-none placeholder:text-fg-3 hover:border-fg-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink aria-[invalid=true]:border-suspicious"

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-eyebrow">{label}</span>
      {children}
    </label>
  )
}

export function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <span className="relative block">
      {children}
      <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-3" />
    </span>
  )
}

export const selectCls = cn(inputCls, "appearance-none pr-8")
