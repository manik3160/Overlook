import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import EvidenceTile, { TileGrid } from "@/components/EvidenceTile"
import SignalChips from "@/components/SignalChips"
import { PageHeader } from "@/components/ui/layout"
import { EmptyState } from "@/components/ui/notice"
import { supabase } from "@/lib/supabase"
import { loadEvidence } from "@/lib/project-data"
import { isAnalyzed, isVerified, METRICS, photosFor, type MetricKey, type PhaseSet } from "@/lib/signals"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Receipt" }

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""
const SETS: PhaseSet[] = ["before", "after", "all"]

const seg = "text-eyebrow !tracking-[0.08em] px-2.5 py-1 hover:text-fg"

export default async function EvidencePage(props: PageProps<"/projects/[id]/evidence">) {
  const { id } = await props.params
  const q = await props.searchParams
  const metric = first(q.metric)
  const set = (SETS.includes(first(q.set) as PhaseSet) ? first(q.set) : "all") as PhaseSet
  const part = first(q.part) === "total" ? "total" : "hits"

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", id).maybeSingle()
  if (!project) notFound()
  const { rows } = await loadEvidence(id)

  let headline: string
  let sub: string
  let ids: string[]
  const signalMetric = METRICS.find((m) => m.key === metric)
  if (signalMetric) {
    ids = photosFor(rows, signalMetric.key as MetricKey, set, part)
    const total = photosFor(rows, signalMetric.key as MetricKey, set, "total").length
    const where = set === "all" ? "all analyzed photos" : `analyzed photos in the ${set} set`
    headline = part === "hits" ? `${ids.length} photo${ids.length === 1 ? "" : "s"} showing ${signalMetric.label.toLowerCase()}` : `${ids.length} analyzed photo${ids.length === 1 ? "" : "s"} in the ${set === "all" ? "project" : set + " set"}`
    sub = part === "hits" ? `out of ${total} ${where}` : `the denominator behind “${signalMetric.label}”`
  } else if (metric === "verified") {
    ids = rows.filter(isVerified).map((r) => r.id)
    headline = `${ids.length} verified or approved photos`
    sub = `out of ${rows.length} photos counted · trust 80+ or approved by a reviewer`
  } else if (metric === "unverified") {
    ids = rows.filter((r) => !isVerified(r)).map((r) => r.id)
    headline = `${ids.length} photos that need review`
    sub = `out of ${rows.length} photos counted`
  } else if (metric === "analyzed") {
    ids = rows.filter(isAnalyzed).map((r) => r.id)
    headline = `${ids.length} AI-analyzed photos`
    sub = `out of ${rows.length} photos counted`
  } else {
    ids = rows.map((r) => r.id)
    headline = `${ids.length} photos`
    sub = "everything counted in this project's scorecard"
  }
  const shown = rows.filter((r) => ids.includes(r.id))
  const href = (over: Record<string, string>) => `/projects/${id}/evidence?${new URLSearchParams({ metric, set, part, ...over })}`

  return (
    <>
      <PageHeader
        back={{ href: `/projects/${id}`, label: project.name }}
        eyebrow={`Receipt · ${signalMetric ? `${signalMetric.label}${set !== "all" ? ` · ${set}` : ""}` : metric || "all photos"}`}
        title={<b className="font-semibold">{headline}</b>}
        meta={sub}
      />
      {signalMetric && (
        <div className="mb-8 flex flex-wrap gap-4" aria-label="Filters">
          <div className="flex border border-line-strong" role="group" aria-label="Set">
            {SETS.map((s) => <Link key={s} href={href({ set: s })} aria-current={set === s ? "true" : undefined} className={cn(seg, set === s ? "bg-fg text-bg hover:text-bg" : "text-fg-2")}>{s}</Link>)}
          </div>
          <div className="flex border border-line-strong" role="group" aria-label="Part">
            <Link href={href({ part: "hits" })} aria-current={part === "hits" ? "true" : undefined} className={cn(seg, part === "hits" ? "bg-fg text-bg hover:text-bg" : "text-fg-2")}>Showing it</Link>
            <Link href={href({ part: "total" })} aria-current={part === "total" ? "true" : undefined} className={cn(seg, part === "total" ? "bg-fg text-bg hover:text-bg" : "text-fg-2")}>All analyzed</Link>
          </div>
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState title="No photos behind this number">Nothing matches this filter yet.</EmptyState>
      ) : (
        <TileGrid>
          {shown.map((r) => (
            <li key={r.id}>
              <EvidenceTile asset={r}>
                {r.signals && isAnalyzed(r) && <SignalChips signals={r.signals} proving={signalMetric?.key as MetricKey | undefined} />}
              </EvidenceTile>
            </li>
          ))}
        </TileGrid>
      )}
    </>
  )
}
