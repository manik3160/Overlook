import Link from "next/link"
import { notFound } from "next/navigation"
import TrustBadge from "@/components/TrustBadge"
import { supabase } from "@/lib/supabase"
import { loadEvidence } from "@/lib/project-data"
import { isAnalyzed, isVerified, METRICS, photosFor, type MetricKey, type PhaseSet } from "@/lib/signals"
import { thumbUrl } from "@/lib/cloudinary-url"
import { formatTime } from "@/lib/dates"

export const dynamic = "force-dynamic"

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""
const SETS: PhaseSet[] = ["before", "after", "all"]

export default async function EvidencePage(props: PageProps<"/projects/[id]/evidence">) {
  const { id } = await props.params
  const q = await props.searchParams
  const metric = first(q.metric)
  const set = (SETS.includes(first(q.set) as PhaseSet) ? first(q.set) : "all") as PhaseSet
  const part = first(q.part) === "total" ? "total" : "hits"

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", id).maybeSingle()
  if (!project) notFound()
  const { rows } = await loadEvidence(id)

  let title: string
  let ids: string[]
  const signalMetric = METRICS.find((m) => m.key === metric)
  if (signalMetric) {
    ids = photosFor(rows, signalMetric.key as MetricKey, set, part)
    title = `${signalMetric.label} — ${set === "all" ? "all analyzed photos" : `${set} photos`} — ${part === "hits" ? "photos showing it" : "all analyzed photos in the set"}`
  } else if (metric === "verified") {
    ids = rows.filter(isVerified).map((r) => r.id)
    title = "Verified or approved photos (evidence coverage)"
  } else if (metric === "unverified") {
    ids = rows.filter((r) => !isVerified(r)).map((r) => r.id)
    title = "Photos that need review"
  } else if (metric === "analyzed") {
    ids = rows.filter(isAnalyzed).map((r) => r.id)
    title = "AI-analyzed photos"
  } else {
    ids = rows.map((r) => r.id)
    title = "All photos counted in this project's scorecard"
  }
  const shown = rows.filter((r) => ids.includes(r.id))

  return (
    <main className="space-y-4 p-8">
      <Link href={`/projects/${id}`} className="underline">← {project.name}</Link>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm">{shown.length} photo(s)</p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {shown.map((r) => (
          <li key={r.id} className="space-y-1 text-sm">
            <Link href={`/assets/${r.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(r.secure_url, r.resource_type)} alt={r.caption ?? ""} width={240} height={240} />
            </Link>
            <TrustBadge score={r.trust_score} reviewStatus={r.review_status} />
            <div>{formatTime(r.taken_at ?? r.created_at)}</div>
            {r.caption && <div>{r.caption}</div>}
            {r.signals && isAnalyzed(r) && <div className="text-xs">{JSON.stringify(r.signals)}</div>}
          </li>
        ))}
      </ul>
    </main>
  )
}
