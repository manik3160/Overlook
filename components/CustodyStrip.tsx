import { formatTime } from "@/lib/dates"
import { cn } from "@/lib/utils"

type Props = {
  takenAt: string | null; hasGps: boolean; status: string; tagCount: number; signalCount: number
  score: number | null; reviewStatus: string
}

function Node({ title, note, done, tone }: { title: string; note: string; done: boolean; tone?: "bad" }) {
  return (
    <li className="relative grid min-w-[112px] flex-1 content-start gap-1 pt-[18px] before:absolute before:left-0 before:right-0 before:top-1 before:h-px before:bg-line-strong last:before:right-auto last:before:w-3">
      <span className={cn("absolute left-0 top-0 size-2.5 rounded-full border", done ? "border-fg bg-fg" : "border-fg-3 bg-bg", tone === "bad" && "border-suspicious bg-suspicious")} aria-hidden="true" />
      <span className="text-[13px] font-semibold leading-5">{title}<span className="sr-only">{done ? " (done)" : " (not yet)"}</span></span>
      <span className="text-data text-fg-3">{note}</span>
    </li>
  )
}

// Five nodes built only from fields already on the asset row (DESIGN.md 8.5).
export default function CustodyStrip({ takenAt, hasGps, status, tagCount, signalCount, score, reviewStatus }: Props) {
  const captured = !!takenAt || hasGps
  return (
    <ol className="flex list-none gap-0 overflow-x-auto p-0 pb-1" aria-label="Chain of custody">
      <Node title="Captured" done={captured} note={takenAt ? formatTime(takenAt) : "No metadata"} />
      <Node title="Uploaded" done note="Cloudinary" />
      <Node title="Analyzed" done={status === "done"} tone={status === "failed" ? "bad" : undefined} note={status === "done" ? `${tagCount} tag${tagCount === 1 ? "" : "s"} · ${signalCount} signals` : status === "failed" ? "Failed · retry" : status} />
      <Node title="Scored" done={score !== null} note={score !== null ? `${score} / 100` : "not yet"} />
      <Node title="Reviewed" done={reviewStatus !== "unreviewed"} note={reviewStatus === "unreviewed" ? "not yet" : reviewStatus} />
    </ol>
  )
}
