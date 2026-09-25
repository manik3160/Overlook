import Link from "next/link"
import { formatDay } from "@/lib/dates"
import type { Cell, Scorecard as ScorecardData } from "@/lib/signals"

const day = (ms: number) => formatDay(new Date(ms).toISOString())

// Every number is a link to the photos behind it (see /projects/[id]/evidence).
function Frac({ projectId, metric, set, cell }: { projectId: string; metric: string; set: string; cell: Cell | null }) {
  if (!cell || cell.total === 0) return <span>–</span>
  const href = (part: string) => `/projects/${projectId}/evidence?metric=${metric}&set=${set}&part=${part}`
  return (
    <span>
      <Link href={href("hits")} className="underline">{cell.hits}</Link>/<Link href={href("total")} className="underline">{cell.total}</Link>
    </span>
  )
}

export default function Scorecard({ projectId, sc, rejected }: { projectId: string; sc: ScorecardData; rejected: number }) {
  const link = (metric: string, text: string | number) => <Link href={`/projects/${projectId}/evidence?metric=${metric}&set=all&part=hits`} className="underline">{text}</Link>
  return (
    <div className="space-y-2 text-sm">
      <p>
        {link("all", `${sc.photos} photos`)} · {link("analyzed", `${sc.analyzed} analyzed`)}
        {rejected > 0 && ` · ${rejected} rejected photo(s) excluded`}
      </p>
      <p>
        Evidence coverage: {sc.verifiedPct === null ? "–" : link("verified", `${sc.verifiedPct}%`)} verified or approved ·{" "}
        Average trust: {sc.avgTrust === null ? "–" : link("all", sc.avgTrust)} ·{" "}
        {sc.flaggedOrUnscored > 0 ? link("unverified", `${sc.flaggedOrUnscored} need review`) : "0 need review"}
      </p>
      {sc.phases ? (
        <p>
          Before: {sc.phases.beforeCount} photos (until {day(sc.phases.beforeEnd)}) · After: {sc.phases.afterCount} photos (from {day(sc.phases.afterStart)}) · {sc.phases.gapDays} days between
        </p>
      ) : (
        <p>Before/after columns appear once photos span a gap of 3+ days.</p>
      )}
      <table className="border-collapse">
        <thead>
          <tr className="text-left"><th className="pr-6">Signal</th><th className="pr-6">Before</th><th className="pr-6">After</th><th>All analyzed</th></tr>
        </thead>
        <tbody>
          {sc.rows.map((r) => (
            <tr key={r.key}>
              <td className="pr-6">{r.label}</td>
              <td className="pr-6"><Frac projectId={projectId} metric={r.key} set="before" cell={r.before} /></td>
              <td className="pr-6"><Frac projectId={projectId} metric={r.key} set="after" cell={r.after} /></td>
              <td><Frac projectId={projectId} metric={r.key} set="all" cell={r.all} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs">x/y = photos showing the signal / analyzed photos in that set. Click any number to see the photos. Only AI-analyzed photos count.</p>
    </div>
  )
}
