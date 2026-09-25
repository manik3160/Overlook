import { Check, Minus, UserCheck, X } from "lucide-react"
import { trustBand, type TrustBand } from "@/lib/trust"
import { cn } from "@/lib/utils"

// Mark shape + band label + score: trust is never colour alone (DESIGN.md 7.3).
const BAND: Record<TrustBand, { cls: string; mark: string; Icon: typeof Check }> = {
  Verified: { cls: "bg-verified-tint text-verified", mark: "bg-verified text-verified-tint", Icon: Check },
  "Needs review": { cls: "bg-review-tint text-review", mark: "bg-review text-review-tint", Icon: Minus },
  Suspicious: { cls: "bg-suspicious-tint text-suspicious", mark: "bg-suspicious text-suspicious-tint", Icon: X },
}

export default function TrustBadge({ score, reviewStatus, size = "sm" }: { score: number | null; reviewStatus?: string; size?: "sm" | "lg" }) {
  const lg = size === "lg"
  if (score === null) {
    return <span className={cn("inline-flex items-center rounded-sm border border-dashed border-line-strong px-2 text-fg-3", lg ? "h-7 text-sm" : "h-[22px] text-xs")}>Not scored</span>
  }
  const band = trustBand(score)
  const { cls, mark, Icon } = BAND[band]
  const rejected = reviewStatus === "rejected"
  const approved = reviewStatus === "approved"
  const label = `Trust: ${band}, score ${score} of 100${approved ? ", approved by reviewer" : rejected ? ", rejected by reviewer" : ""}`
  return (
    <span role="img" aria-label={label} title={approved ? "Approved by a reviewer" : undefined} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm pl-1 pr-2 font-medium", cls, lg ? "h-7 text-sm" : "h-[22px] text-xs")}>
      <span aria-hidden="true" className={cn("grid place-items-center rounded-[2px]", mark, lg ? "size-[18px]" : "size-3.5")}>
        <Icon size={lg ? 13 : 10} strokeWidth={3} />
      </span>
      <span aria-hidden="true">{band}</span>
      <span aria-hidden="true" className="opacity-50">·</span>
      <span aria-hidden="true" className={cn("font-mono tabular-nums", lg ? "text-[13px]" : "text-[11.5px]", rejected && "line-through")}>{score}</span>
      {approved && <UserCheck size={lg ? 14 : 12} strokeWidth={1.5} aria-hidden="true" className="ml-0.5 text-fg-2" />}
      {rejected && <span aria-hidden="true" className="text-fg-2">· rejected</span>}
    </span>
  )
}
