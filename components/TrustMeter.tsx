import { trustBand } from "@/lib/trust"
import { NO_METADATA_CAP } from "@/lib/trust"

const FILL = { Verified: "bg-verified", "Needs review": "bg-review", Suspicious: "bg-suspicious" } as const

// 0-100 bar with the 50 / 80 band ticks. `capped` draws the NO_METADATA cap line (DESIGN.md 7.4).
export default function TrustMeter({ score, capped = false }: { score: number; capped?: boolean }) {
  const band = trustBand(score)
  return (
    <div className="grid gap-1.5">
      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-valuetext={`${score}, ${band.toLowerCase()}`} aria-label="Trust score" className="relative h-1.5 bg-surface-3">
        <span className={`absolute inset-y-0 left-0 transition-[width] duration-200 ${FILL[band]}`} style={{ width: `${score}%` }} />
        {[50, 80].map((t) => <span key={t} className="absolute -top-0.5 h-2.5 w-px bg-line-strong" style={{ left: `${t}%` }} />)}
        {capped && <span className="absolute -top-1 h-3.5 border-l border-dashed border-fg-3" style={{ left: `${NO_METADATA_CAP}%` }} />}
        <span className="absolute -top-1 h-3.5 w-px bg-fg" style={{ left: `${score}%` }} />
      </div>
      <div className="relative h-3.5 font-mono text-[9px] leading-[14px] text-fg-3" aria-hidden="true">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: "50%" }}>50</span>
        <span className="absolute -translate-x-1/2" style={{ left: "80%" }}>80</span>
        <span className="absolute right-0">100</span>
        {capped && <span className="absolute -translate-x-1/2" style={{ left: `${NO_METADATA_CAP}%`, top: 12 }}>cap 60</span>}
      </div>
    </div>
  )
}
