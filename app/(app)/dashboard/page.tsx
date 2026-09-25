import Link from "next/link"
import type { Metadata } from "next"
import ProjectForm from "@/components/ProjectForm"
import CustodyFunnel from "@/components/CustodyFunnel"
import ContactSheet from "@/components/ContactSheet"
import TrustBadge from "@/components/TrustBadge"
import { TileImage } from "@/components/EvidenceTile"
import { PageHeader, Section } from "@/components/ui/layout"
import { InlineNotice } from "@/components/ui/notice"
import { Sheet } from "@/components/ui/sheet"
import { buttonVariants } from "@/components/ui/button"
import { flagTitle } from "@/components/flag-copy"
import { tileState } from "@/components/evidence-state"
import { supabase } from "@/lib/supabase"
import { clusterPoints, type GeoPoint } from "@/lib/geo"
import { formatDay, formatTime } from "@/lib/dates"
import { computeStats } from "@/lib/stats"
import { VERIFIED_SCORE } from "@/lib/signals"
import { trustBand } from "@/lib/trust"
import type { Project } from "@/lib/project-schema"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Overview" }

type Flag = { code: string; severity: string; reason: string }
type Row = {
  id: string; public_id: string; project_id: string | null; secure_url: string; lat: number | null; lng: number | null
  taken_at: string | null; created_at: string; resource_type: string; status: string; parent_asset_id: string | null
  trust_score: number | null; trust_flags: Flag[] | null; review_status: string
}

const PIPELINE = [
  ["01", "Upload", "Photos and video with GPS and time, read before they leave the device."],
  ["02", "Analyze", "Tags, a caption and six visual signals, cached so nothing is paid for twice."],
  ["03", "Score", "A trust score with plain-language reasons, and a human review queue."],
  ["04", "Prove", "A PDF with a QR code that anyone can scan to verify."],
]

export default async function Dashboard() {
  const [{ data: projectRows }, { data: assetRows }, { data: reportRows }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("assets").select("id, public_id, project_id, secure_url, lat, lng, taken_at, created_at, resource_type, status, parent_asset_id, trust_score, trust_flags, review_status"),
    supabase.from("reports").select("kind"),
  ])
  const projects = (projectRows ?? []) as Project[]
  const assets = (assetRows ?? []) as Row[]
  const stats = computeStats(assets)
  const reports = (reportRows ?? []).filter((r) => r.kind !== "social").length
  const stories = (reportRows ?? []).filter((r) => r.kind === "social").length

  // Band counts use the same rule as "verified": approved counts as verified, rejected is excluded.
  const bands = { verified: 0, review: 0, suspicious: 0 }
  for (const a of assets) {
    if (a.review_status === "rejected" || a.trust_score === null) continue
    if (a.review_status === "approved" || a.trust_score >= VERIFIED_SCORE) bands.verified++
    else if (trustBand(a.trust_score) === "Needs review") bands.review++
    else bands.suspicious++
  }

  const perProject = new Map<string, { n: number; scored: number; sum: number }>()
  for (const a of assets) {
    if (!a.project_id) continue
    const p = perProject.get(a.project_id) ?? { n: 0, scored: 0, sum: 0 }
    p.n++
    if (a.trust_score !== null) { p.scored++; p.sum += a.trust_score }
    perProject.set(a.project_id, p)
  }

  const flagged = assets
    .filter((a) => a.review_status === "unreviewed" && (a.trust_flags ?? []).length > 0 && a.trust_score !== null)
    .sort((x, y) => (x.trust_score ?? 100) - (y.trust_score ?? 100))
  const latest = [...assets].sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, 16)

  const unassigned = assets.filter((a) => !a.project_id)
  const points: GeoPoint[] = unassigned
    .filter((a) => a.lat !== null && a.lng !== null)
    .map((a) => ({ id: a.id, lat: a.lat!, lng: a.lng!, time: new Date(a.taken_at ?? a.created_at).getTime() }))
  const suggestions = clusterPoints(points)
  const ungroupable = unassigned.length - suggestions.reduce((n, c) => n + c.ids.length, 0)
  const byId = new Map(assets.map((a) => [a.id, a]))

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title={<><b className="font-semibold">Evidence</b> ledger</>}
        meta={stats.total ? `${stats.total} files · ${projects.length} project${projects.length === 1 ? "" : "s"} · last upload ${formatTime(latest[0].created_at)} IST` : undefined}
        actions={<Link href="/upload" className={buttonVariants({ size: "default" })}>Upload evidence</Link>}
      />

      {stats.total === 0 ? (
        <Section eyebrow="Get started" title="Nothing in the ledger yet.">
          <ol className="grid list-none grid-cols-1 border-t border-line p-0 md:grid-cols-4">
            {PIPELINE.map(([n, t, d]) => (
              <li key={n} className="grid content-start gap-1.5 border-b border-line py-4 md:border-b-0 md:border-l md:px-5 md:first:border-l-0 md:first:pl-0">
                <span className="text-eyebrow">{n}</span>
                <span className="text-title">{t}</span>
                <span className="text-small">{d}</span>
              </li>
            ))}
          </ol>
          <div><Link href="/upload" className={buttonVariants({ size: "lg" })}>Upload evidence</Link></div>
        </Section>
      ) : (
        <>
          <Section id="chain" eyebrow="01 · Chain of custody" title="From upload to verified evidence">
            <CustodyFunnel stats={stats} bands={bands} reports={reports} stories={stories} />
          </Section>

          {flagged.length > 0 && (
            <Section id="flagged" eyebrow="02 · Flagged for review" title="Lowest scores first" action={<Link href="/review" className="text-small text-accent-ink hover:underline">View queue ({flagged.length}) →</Link>}>
              <ul className="grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3">
                {flagged.slice(0, 3).map((a) => {
                  const first = (a.trust_flags ?? []).find((f) => f.severity === "high") ?? a.trust_flags![0]
                  return (
                    <li key={a.id}>
                      <Link href={`/assets/${a.id}`} className="tile grid grid-cols-[88px_1fr] gap-3.5 rounded-md border border-line bg-surface-1 p-3 hover:border-line-strong" data-flagged={tileState(a).flagged || undefined}>
                        <TileImage asset={a} compact />
                        <span className="grid min-w-0 content-start gap-1.5">
                          <span><TrustBadge score={a.trust_score} reviewStatus={a.review_status} /></span>
                          <span className="text-[14px] font-semibold leading-5">{flagTitle(first.code)}</span>
                          <span className="text-data truncate text-fg-3">{a.public_id.split("/").pop()}{(a.trust_flags?.length ?? 0) > 1 ? ` · +${a.trust_flags!.length - 1} more` : ""}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Section>
          )}

          <Section id="latest" eyebrow="03 · Latest evidence" title="Contact sheet, newest first" action={<Link href="/upload" className="text-small text-accent-ink hover:underline">All uploads →</Link>}>
            <ContactSheet
              edgeTop={[`Upload batch · ${formatDay(latest[0].created_at)}`, `${latest.length} frames`]}
              edgeBottom={["Blue = waiting for analysis or flagged · colour = verified", "hover a frame for its marks"]}
              assets={latest}
            />
          </Section>

          <Section id="projects" eyebrow="04 · Projects" title={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
            action={<Sheet title="New project" trigger="New project" size="sm"><ProjectForm mode="create" submitLabel="Create project" /></Sheet>}>
            {projects.length === 0 ? (
              <InlineNotice>No projects yet: create one, or confirm a suggestion once you have geotagged photos.</InlineNotice>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="text-eyebrow border-b border-line">
                      <th className="pb-2.5 pr-3 font-medium">Name</th>
                      <th className="hidden pb-2.5 pr-3 font-medium md:table-cell">Activity</th>
                      <th className="pb-2.5 pr-3 text-right font-medium">Photos</th>
                      <th className="pb-2.5 pl-4 pr-3 font-medium">Avg trust</th>
                      <th className="hidden pb-2.5 font-medium lg:table-cell">Dates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const s = perProject.get(p.id)
                      return (
                        <tr key={p.id} className="relative border-b border-line hover:bg-surface-1">
                          <td className="py-3.5 pr-3"><Link href={`/projects/${p.id}`} className="text-title after:absolute after:inset-0 hover:underline">{p.name}</Link></td>
                          <td className="text-data hidden pr-3 text-fg-3 md:table-cell">{p.activity_type ?? "no activity"}</td>
                          <td className="text-data pr-3 text-right">{s?.n ?? 0}</td>
                          <td className="pl-4 pr-3"><TrustBadge score={s && s.scored ? Math.round(s.sum / s.scored) : null} /></td>
                          <td className="text-data hidden text-fg-3 lg:table-cell">{p.start_date ? `${formatDay(p.start_date)} → ${p.end_date ? formatDay(p.end_date) : "…"}` : "no dates"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section id="suggested" eyebrow="05 · Suggested projects" title="Grouped by place and time">
            {suggestions.length === 0 && <InlineNotice>No suggestions: upload photos with GPS (3+ within 500 m and 60 days).</InlineNotice>}
            {suggestions.map((c) => (
              <div key={c.ids[0]} className="flex flex-wrap items-center justify-between gap-5 rounded-md border border-line bg-surface-1 px-5 py-4">
                <div className="grid gap-2">
                  <p className="text-title">{c.ids.length} photos near <span className="font-mono">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span></p>
                  <p className="text-data text-fg-3">
                    {formatDay(new Date(c.start).toISOString())}{c.end - c.start > 0 && ` – ${formatDay(new Date(c.end).toISOString())}`} · radius ≈ {c.radiusM} m
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {c.ids.slice(0, 5).map((id) => byId.get(id) && <span key={id} className="block w-12"><TileImage asset={byId.get(id)!} compact bare /></span>)}
                  {c.ids.length > 5 && <span className="text-data grid h-12 min-w-12 place-items-center border border-line text-fg-2">+{c.ids.length - 5}</span>}
                </div>
                <Sheet title="Confirm project" trigger="Review & create">
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
                </Sheet>
              </div>
            ))}
            {ungroupable > 0 && <p className="text-small">{ungroupable} unassigned photos can&apos;t be grouped automatically (no GPS, or too few nearby). Assign them from a project page.</p>}
          </Section>
        </>
      )}
    </>
  )
}
