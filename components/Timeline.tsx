import Link from "next/link"
import { TileImage, type TileAsset } from "@/components/EvidenceTile"
import { tileState } from "@/components/evidence-state"

export type TimelineItem = TileAsset & { time: string; approx: boolean }
export type TimelineDay = { day: string; label: string; items: TimelineItem[] }

const DAY = 86_400_000
const gapDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY)

// Horizontal strip, one column per day, on a 1px axis. A gap of more than 2 days gets its own dashed column,
// which also shows where the scorecard splits before from after (DESIGN.md 7.12).
export default function Timeline({ days }: { days: TimelineDay[] }) {
  if (days.length === 0) return <p className="text-small">No photos assigned yet.</p>
  return (
    <ol className="flex list-none snap-x snap-proximity overflow-x-auto p-0 pb-2" aria-label="Photos by day">
      {days.map((d, i) => {
        const gap = i > 0 ? gapDays(days[i - 1].day, d.day) : 0
        return (
          <li key={d.day} className="contents">
            {gap > 2 && (
              <div className="grid w-16 shrink-0 content-start gap-2.5 pr-[18px]" aria-label={`${gap} day gap`}>
                <span className="text-micro text-fg-3">+{gap} d</span>
                <span className="h-[9px] border-b border-dashed border-line-strong" />
              </div>
            )}
            <div className="grid shrink-0 snap-start content-start gap-2.5 pr-[18px]">
              <span className="text-micro text-fg-3">{d.label} · {d.items.length}</span>
              <span className="relative h-[9px] border-b border-line-strong after:absolute after:-bottom-[3px] after:left-0 after:size-[5px] after:rounded-full after:bg-fg" />
              <div className="grid grid-flow-col grid-rows-2 gap-1 [grid-auto-columns:44px]">
                {d.items.map((it) => (
                  <Link key={it.id} href={`/assets/${it.id}`} className="tile block size-11" data-flagged={tileState(it).flagged || undefined} title={it.approx ? "No photo time: upload time used" : it.time} aria-label={`Photo, ${it.time}`}>
                    <span className={it.approx ? "block outline outline-1 -outline-offset-1 outline-dashed outline-line-strong" : "block"}><TileImage asset={it} bare /></span>
                  </Link>
                ))}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
