import type { ReactNode } from "react"
import { CircleAlert, Info, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const RULE = { neutral: "border-l-line-strong", success: "border-l-verified", error: "border-l-suspicious", warning: "border-l-review" } as const
const ICON = { neutral: Info, success: Check, error: CircleAlert, warning: CircleAlert } as const

// Operation results and errors (replaces the plain `note` strings). 3px rule, icon, optional action.
export function InlineNotice({ tone = "neutral", children, action, className }: {
  tone?: keyof typeof RULE; children: ReactNode; action?: ReactNode; className?: string
}) {
  const Icon = ICON[tone]
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 border border-line border-l-[3px] bg-surface-1 px-3 py-2.5 text-[13px] leading-5 text-fg-2", RULE[tone], className)}>
      <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, visual, title, children, action }: { icon?: ReactNode; visual?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn("grid items-center gap-x-10 gap-y-5 rounded-md border border-dashed border-line-strong px-6 py-7", visual && "lg:grid-cols-[minmax(0,420px)_1fr]")}>
      {visual}
      <div className="grid justify-items-start gap-2">
        {icon && <div className="text-fg-3">{icon}</div>}
        <p className="text-h2">{title}</p>
        {children && <p className="text-small max-w-[56ch] text-[15px] leading-6">{children}</p>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  )
}
