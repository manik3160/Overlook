import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { NA } from "@/lib/copy"

// A "receipt number": a big figure that shows its denominator and links to the photos behind it (DESIGN.md 7.8).
export default function StatFigure({ eyebrow, value, of, note, href, receipt, small = false, className }: {
  eyebrow: string; value: ReactNode; of?: ReactNode; note?: ReactNode; href?: string; receipt?: string; small?: boolean; className?: string
}) {
  const body = (
    <>
      <span className="text-eyebrow">{eyebrow}</span>
      <span className={cn("text-data-xl", small && "!text-[30px] !leading-8")}>
        {value ?? <span className="text-[0.55em] text-fg-3">{NA}</span>}
        {of !== undefined && <small className="ml-1 text-[0.5em] text-fg-3">/ {of}</small>}
      </span>
      {note && <span className="text-small">{note}</span>}
      {receipt && href && <span className="mt-1.5 text-[13px] text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] group-hover:decoration-accent-ink">{receipt}</span>}
    </>
  )
  const cls = cn("grid content-start gap-1.5 border-b border-r border-line px-5 pb-[22px] pt-5", className)
  return href ? <Link href={href} className={cn(cls, "group hover:bg-surface-1")}>{body}</Link> : <div className={cls}>{body}</div>
}
