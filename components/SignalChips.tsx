import type { MetricKey, Signals } from "@/lib/signals"
import { NA } from "@/lib/copy"
import { cn } from "@/lib/utils"

const items = (s: Signals): { key: MetricKey; text: string }[] => [
  { key: "garbage_visible", text: `garbage ${s.garbage_visible ? "✓" : "no"}` },
  { key: "vegetation_dense", text: `vegetation ${s.vegetation ?? NA}` },
  { key: "water_present", text: `water ${s.water_present ? "✓" : "no"}` },
  { key: "structure_complete", text: `structure ${(s.structure_stage ?? NA).replace("_", " ")}` },
  { key: "people_working", text: `${s.people_working ?? 0} people` },
  { key: "safety_gear", text: `safety gear ${s.safety_gear ? "✓" : "no"}` },
]

// The signal being proven is bold; the rest are muted (DESIGN.md 8.4).
export default function SignalChips({ signals, proving }: { signals: Signals; proving?: MetricKey }) {
  return (
    <span className="text-data flex flex-wrap gap-x-2 text-[11px] leading-4 text-fg-3">
      {items(signals).map((i) => <span key={i.key} className={cn(i.key === proving && "font-semibold text-fg")}>{i.text}</span>)}
    </span>
  )
}
