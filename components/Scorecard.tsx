import Link from "next/link"
import StatFigure from "@/components/StatFigure"
import { formatDay } from "@/lib/dates"
import { NA } from "@/lib/copy"
import type { Cell, Scorecard as ScorecardData } from "@/lib/signals"
import { cn } from "@/lib/utils"

const day = (ms: number) => formatDay(new Date(ms).toISOString())
const pct = (c: Cell | null) => (c && c.total ? (c.hits / c.total) * 100 : null)

// Every number is a link to the photos behind it (see /projects/[id]/evidence). Both parts of x/y stay separate links.
function Frac({ projectId, metric, set, cell }: { projectId: string; metric: string; set: string; cell: Cell | null }) {
  if (!cell || cell.total === 0) return <span className="text-fg-3">{NA}</span>
  const href = (part: string) => `/projects/${projectId}/evidence?metric=${metric}&set=${set}&part=${part}`
  const a = "border-b border-accent-ink/45 hover:border-accent-ink hover:text-accent-ink"
  return (
    <span className="text-data whitespace-nowrap">
      <Link href={href("hits")} className={a}>{cell.hits}</Link>/<Link href={href("total")} className={a}>{cell.total}</Link>
    </span>
  )
}

const Mini = ({ value, tone }: { value: number | null; tone: "before" | "after" }) => (
  <span className="ml-2.5 hidden h-1 w-14 bg-surface-3 align-middle md:inline-block" aria-hidden="true">
    <i className={cn("block h-full", tone === "before" ? "bg-fg-3" : "bg-fg")} style={{ width: `${value ?? 0}%` }} />
  </span>
)

export default function Scorecard({ projectId, sc, rejected }: { projectId: string; sc: ScorecardData; rejected: number }) {
  const link = (metric: string) => `/projects/${projectId}/evidence?metric=${metric}&set=all&part=hits`
  const hasPhases = !!sc.phases
  const cols = hasPhases ? "sm:grid-cols-[minmax(0,1.5fr)_1fr_1fr_84px_64px]" : "sm:grid-cols-[minmax(0,1.5fr)_1fr]"
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 xl:grid-cols-5">
        <StatFigure small eyebrow="Photos" value={sc.photos} href={link("all")} receipt="Receipt →" />
        <StatFigure small eyebrow="Analyzed" value={sc.analyzed} href={link("analyzed")} receipt="Receipt →" />
        <StatFigure small eyebrow="Coverage" value={sc.verifiedPct === null ? null : <>{sc.verifiedPct}<small className="ml-0.5 text-[0.5em] text-fg-3">%</small></>} href={sc.verifiedPct === null ? undefined : link("verified")} receipt="Receipt →" />
        <StatFigure small eyebrow="Avg trust" value={sc.avgTrust} href={sc.avgTrust === null ? undefined : link("all")} receipt="Receipt →" />
        <StatFigure small eyebrow="Need review" value={sc.flaggedOrUnscored} href={sc.flaggedOrUnscored > 0 ? link("unverified") : undefined} receipt="Receipt →" />
      </div>
      {rejected > 0 && <p className="text-small">{rejected} rejected photo{rejected === 1 ? "" : "s"} excluded from every number.</p>}

      {sc.phases ? (
        <p className="text-eyebrow flex flex-wrap gap-x-5 gap-y-1 !tracking-[0.08em] !text-fg-2">
          <span>Before ≤ <b className="font-semibold text-fg">{day(sc.phases.beforeEnd)}</b> · {sc.phases.beforeCount} photos</span>
          <span>After ≥ <b className="font-semibold text-fg">{day(sc.phases.afterStart)}</b> · {sc.phases.afterCount} photos</span>
          <span><b className="font-semibold text-fg">{sc.phases.gapDays}-day</b> gap</span>
        </p>
      ) : (
        <p className="text-small">Before/after columns appear once photos span a gap of 3 or more days.</p>
      )}

      <div role="table" aria-label="Impact scorecard by signal" className="grid">
        <div role="row" className={cn("text-eyebrow hidden gap-4 border-b border-line pb-2.5 sm:grid", cols)}>
          <span role="columnheader">Signal</span>
          {hasPhases && <><span role="columnheader">Before</span><span role="columnheader">After</span><span role="columnheader" className="text-right">Change</span></>}
          <span role="columnheader" className="text-right">{hasPhases ? "All" : "All analyzed"}</span>
        </div>
        {sc.rows.map((r) => {
          const b = pct(r.before), a = pct(r.after)
          const d = b !== null && a !== null ? Math.round(a - b) : null
          return (
            <div key={r.key} role="row" className={cn("grid items-center gap-x-4 gap-y-1.5 border-b border-line py-3", cols)}>
              <span role="cell" className="text-[15px]">{r.label}</span>
              {hasPhases && (
                <>
                  <span role="cell" className="flex items-center"><span className="text-eyebrow mr-2 sm:hidden">Before</span><Frac projectId={projectId} metric={r.key} set="before" cell={r.before} /><Mini value={b} tone="before" /></span>
                  <span role="cell" className="flex items-center"><span className="text-eyebrow mr-2 sm:hidden">After</span><Frac projectId={projectId} metric={r.key} set="after" cell={r.after} /><Mini value={a} tone="after" /></span>
                  <span role="cell" className="text-data text-fg-2 sm:text-right"><span className="text-eyebrow mr-2 sm:hidden">Change</span>{d === null ? NA : `${d > 0 ? "↑ +" : d < 0 ? "↓ −" : "± "}${Math.abs(d)} pts`}</span>
                </>
              )}
              <span role="cell" className={cn("sm:text-right", hasPhases && "max-sm:hidden")}><Frac projectId={projectId} metric={r.key} set="all" cell={r.all} /></span>
            </div>
          )
        })}
      </div>
      <p className="text-small text-fg-3">x/y = photos showing the signal / analyzed photos in that set. Click any number to see those photos. Only AI-analyzed photos count.</p>
    </div>
  )
}
