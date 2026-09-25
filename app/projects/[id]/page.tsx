import Link from "next/link"
import { notFound } from "next/navigation"
import ProjectForm from "@/components/ProjectForm"
import ProjectMap from "@/components/ProjectMapLoader"
import Timeline, { type TimelineDay } from "@/components/Timeline"
import AssetPicker from "@/components/AssetPicker"
import Scorecard from "@/components/Scorecard"
import PairsPanel, { type PairView } from "@/components/PairsPanel"
import { loadEvidence } from "@/lib/project-data"
import { computeScorecard } from "@/lib/signals"
import { slideUrl } from "@/lib/cloudinary-url"
import { supabase } from "@/lib/supabase"
import { haversineM } from "@/lib/geo"
import { dayKey, formatDay, formatTime } from "@/lib/dates"
import { thumbUrl } from "@/lib/cloudinary-url"
import type { Project } from "@/lib/project-schema"

export const dynamic = "force-dynamic"

type A = { trust_score: number | null; id: string; public_id: string; secure_url: string; resource_type: string; lat: number | null; lng: number | null; taken_at: string | null; created_at: string }
const COLS = "trust_score, id, public_id, secure_url, resource_type, lat, lng, taken_at, created_at"

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle<Project>()
  if (!project) notFound()

  const [{ data: mine }, { data: free }] = await Promise.all([
    supabase.from("assets").select(COLS).eq("project_id", id).order("taken_at", { ascending: true, nullsFirst: false }),
    supabase.from("assets").select(COLS).is("project_id", null).order("created_at", { ascending: false }).limit(200),
  ])
  const assets = (mine ?? []) as A[]
  const { rows: evidence, rejected } = await loadEvidence(id)
  const scorecard = computeScorecard(evidence)
  const { data: pairRows } = await supabase.from("pairs").select("id, before_asset_id, after_asset_id, distance_m, days_apart, change_summary").eq("project_id", id).order("created_at")
  const byId = new Map(evidence.map((e) => [e.id, e]))
  const pairs: PairView[] = (pairRows ?? []).flatMap((p) => {
    const b = byId.get(p.before_asset_id), a = byId.get(p.after_asset_id)
    if (!b || !a) return []
    return [{ id: p.id, beforeId: b.id, afterId: a.id, beforeUrl: slideUrl(b.secure_url), afterUrl: slideUrl(a.secure_url), beforeLabel: formatDay(b.taken_at ?? b.created_at), afterLabel: formatDay(a.taken_at ?? a.created_at), distanceM: p.distance_m, daysApart: p.days_apart, summary: p.change_summary }]
  })
  const center = project.center_lat !== null && project.center_lng !== null ? { lat: project.center_lat, lng: project.center_lng } : null
  const radius = project.radius_m ?? 500
  const distance = (a: A) => (center && a.lat !== null && a.lng !== null ? haversineM(center, { lat: a.lat, lng: a.lng }) : null)

  const points = assets
    .filter((a) => a.lat !== null && a.lng !== null)
    .map((a) => {
      const d = distance(a)
      return { id: a.id, lat: a.lat!, lng: a.lng!, thumb: thumbUrl(a.secure_url, a.resource_type), label: formatTime(a.taken_at ?? a.created_at), inside: d === null ? null : d <= radius }
    })
  const outside = points.filter((p) => p.inside === false).length

  const byDay = new Map<string, TimelineDay>()
  for (const a of assets) {
    const when = a.taken_at ?? a.created_at
    const key = dayKey(when)
    const day = byDay.get(key) ?? { day: key, label: formatDay(when), items: [] }
    day.items.push({ id: a.id, secure_url: a.secure_url, resource_type: a.resource_type, time: formatTime(when), approx: !a.taken_at })
    byDay.set(key, day)
  }
  const days = [...byDay.values()].sort((x, y) => x.day.localeCompare(y.day))

  const pool = ((free ?? []) as A[])
    .map((a) => ({ a, d: distance(a) }))
    .sort((x, y) => (x.d ?? Infinity) - (y.d ?? Infinity))
    .map(({ a, d }) => ({ id: a.id, thumb: thumbUrl(a.secure_url, a.resource_type), label: d === null ? "no GPS" : `${Math.round(d)} m from center` }))

  return (
    <main className="space-y-8 p-8">
      <Link href="/" className="underline">← All projects</Link>
      <header>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm">
          {project.activity_type ?? "no activity"} · {assets.length} photos
          {project.start_date && ` · ${project.start_date} → ${project.end_date ?? "…"}`}
          {center && ` · geofence ${radius} m`}
        </p>
        {outside > 0 && <p className="text-sm">{outside} photo(s) are outside the geofence (shown red, flagged for review in Phase 4).</p>}
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Impact scorecard</h2>
        <Scorecard projectId={id} sc={scorecard} rejected={rejected} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Before / after</h2>
        <PairsPanel projectId={id} pairs={pairs} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Map</h2>
        <ProjectMap center={center} radiusM={radius} points={points} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Timeline</h2>
        <Timeline days={days} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Assigned photos</h2>
        <AssetPicker projectId={id} action="unassign" buttonLabel="Remove from project" assets={assets.map((a) => ({ score: a.trust_score, id: a.id, thumb: thumbUrl(a.secure_url, a.resource_type), label: distance(a) === null ? "no GPS" : `${Math.round(distance(a)!)} m from center` }))} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Add unassigned photos ({pool.length})</h2>
        <AssetPicker projectId={id} action="assign" buttonLabel="Add to project" assets={pool} />
      </section>

      <details>
        <summary className="cursor-pointer text-lg font-medium">Edit project</summary>
        <ProjectForm mode="edit" projectId={id} submitLabel="Save changes" initial={project} />
      </details>
    </main>
  )
}
