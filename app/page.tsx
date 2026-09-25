import Link from "next/link"
import ProjectForm from "@/components/ProjectForm"
import { supabase } from "@/lib/supabase"
import { clusterPoints, type GeoPoint } from "@/lib/geo"
import { formatDay } from "@/lib/dates"
import type { Project } from "@/lib/project-schema"

export const dynamic = "force-dynamic"

type AssetGeo = { id: string; project_id: string | null; lat: number | null; lng: number | null; taken_at: string | null; created_at: string }

export default async function Home() {
  const [{ data: projectRows }, { data: assetRows }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("assets").select("id, project_id, lat, lng, taken_at, created_at"),
  ])
  const projects = (projectRows ?? []) as Project[]
  const assets = (assetRows ?? []) as AssetGeo[]

  const countByProject = new Map<string, number>()
  for (const a of assets) if (a.project_id) countByProject.set(a.project_id, (countByProject.get(a.project_id) ?? 0) + 1)

  const unassigned = assets.filter((a) => !a.project_id)
  const points: GeoPoint[] = unassigned
    .filter((a) => a.lat !== null && a.lng !== null)
    .map((a) => ({ id: a.id, lat: a.lat!, lng: a.lng!, time: new Date(a.taken_at ?? a.created_at).getTime() }))
  const suggestions = clusterPoints(points)
  const ungroupable = unassigned.length - suggestions.reduce((n, c) => n + c.ids.length, 0)

  return (
    <main className="space-y-8 p-8">
      <header className="flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold">Overlook</h1>
        <Link href="/upload" className="underline">Upload &amp; analyze</Link>
        <Link href="/search" className="underline">Search</Link>
        <Link href="/review" className="underline">Review queue</Link>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Projects ({projects.length})</h2>
        <ul className="space-y-1">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="underline">{p.name}</Link>{" "}
              · {p.activity_type ?? "no activity"} · {countByProject.get(p.id) ?? 0} photos
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer">New project (manual)</summary>
          <ProjectForm mode="create" submitLabel="Create project" />
        </details>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Suggested projects ({suggestions.length})</h2>
        {suggestions.length === 0 && <p className="text-sm">No suggestions: upload photos with GPS (3+ within 500 m and 60 days).</p>}
        {suggestions.map((c) => (
          <details key={c.ids[0]} className="border p-2">
            <summary className="cursor-pointer">
              Suggested project: {c.ids.length} photos near {c.lat.toFixed(4)}, {c.lng.toFixed(4)} · {formatDay(new Date(c.start).toISOString())}
              {c.end - c.start > 0 && ` – ${formatDay(new Date(c.end).toISOString())}`}
            </summary>
            <ProjectForm
              mode="create"
              submitLabel={`Confirm and create (${c.ids.length} photos)`}
              assetIds={c.ids}
              initial={{
                center_lat: Number(c.lat.toFixed(6)),
                center_lng: Number(c.lng.toFixed(6)),
                radius_m: c.radiusM,
                start_date: new Date(c.start).toISOString().slice(0, 10),
                end_date: new Date(c.end).toISOString().slice(0, 10),
              }}
            />
          </details>
        ))}
        {ungroupable > 0 && <p className="text-sm">{ungroupable} unassigned photos can&apos;t be grouped automatically (no GPS, or too few nearby). Assign them from a project page.</p>}
      </section>
    </main>
  )
}
