import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import ProjectForm from "@/components/ProjectForm"
import ProjectMap from "@/components/ProjectMapLoader"
import Timeline, { type TimelineDay } from "@/components/Timeline"
import AssetPicker, { type PickerAsset } from "@/components/AssetPicker"
import Scorecard from "@/components/Scorecard"
import ReportsPanel, { type ReportListItem } from "@/components/ReportsPanel"
import CampaignCards from "@/components/CampaignCards"
import StoryPanel from "@/components/StoryPanel"
import ReelPanel, { type ReelView } from "@/components/ReelPanel"
import SatellitePanel, { type SatelliteView } from "@/components/SatellitePanel"
import PairsPanel, { type PairView } from "@/components/PairsPanel"
import SectionNav from "@/components/SectionNav"
import type { TileAsset } from "@/components/EvidenceTile"
import { PageHeader, Section } from "@/components/ui/layout"
import { InlineNotice } from "@/components/ui/notice"
import { Sheet } from "@/components/ui/sheet"
import { buttonVariants } from "@/components/ui/button"
import { loadCampaign } from "@/lib/campaign-data"
import { reelSeconds, reelUrl } from "@/lib/reel"
import { manifestHash } from "@/lib/manifest"
import { loadEvidence } from "@/lib/project-data"
import { computeScorecard } from "@/lib/signals"
import { slideUrl, thumbUrl } from "@/lib/cloudinary-url"
import { selectAll, supabase } from "@/lib/supabase"
import { haversineM } from "@/lib/geo"
import { dayKey, formatDay, formatTime } from "@/lib/dates"
import type { Project } from "@/lib/project-schema"

export const dynamic = "force-dynamic"

type A = TileAsset & { public_id: string; created_at: string }
const COLS = "id, public_id, secure_url, resource_type, lat, lng, taken_at, created_at, status, trust_score, trust_flags, review_status, caption, tags, parent_asset_id, frame_second"

export async function generateMetadata(props: PageProps<"/projects/[id]">): Promise<Metadata> {
  const { id } = await props.params
  const { data } = await supabase.from("projects").select("name").eq("id", id).maybeSingle()
  return { title: data?.name ?? "Project" }
}

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle<Project>()
  if (!project) notFound()

  const [{ data: mine }, { data: free }] = await Promise.all([
    selectAll<A>((from, to) =>
      supabase.from("assets").select(COLS).eq("project_id", id).order("taken_at", { ascending: true, nullsFirst: false }).order("id").range(from, to),
    ).then((data) => ({ data })),
    supabase.from("assets").select(COLS).is("project_id", null).order("created_at", { ascending: false }).limit(200),
  ])
  const assets = (mine ?? []) as A[]
  const { rows: evidence, rejected } = await loadEvidence(id)
  const scorecard = computeScorecard(evidence)
  const { data: pairRows } = await supabase.from("pairs").select("id, before_asset_id, after_asset_id, distance_m, days_apart, change_summary").eq("project_id", id).order("created_at")
  const { data: reportRows } = await supabase.from("reports").select("id, kind, manifest_sha256, created_at").eq("project_id", id).in("kind", ["donor", "csr", "social"]).order("created_at", { ascending: false })
  const reports: ReportListItem[] = (reportRows ?? []).map((r) => ({ id: r.id, kind: r.kind, sha: r.manifest_sha256, createdAt: formatTime(r.created_at) }))
  const campaign = await loadCampaign(id)
  const { data: reelRow } = await supabase.from("reports").select("manifest, created_at").eq("project_id", id).eq("kind", "reel").order("created_at", { ascending: false }).limit(1).maybeSingle()
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const reelSlides = ((reelRow?.manifest?.slides ?? []) as { slide_public_id: string }[]).map((s) => s.slide_public_id)
  const reel: ReelView | null = reelRow && cloud && reelSlides.length
    ? { url: reelUrl(cloud, reelSlides), downloadUrl: reelUrl(cloud, reelSlides, { download: "overlook-reel" }), seconds: reelSeconds(reelSlides.length), generatedAt: formatTime(reelRow.created_at) }
    : null
  const { data: satRow } = await supabase.from("reports").select("manifest, manifest_sha256, created_at").eq("project_id", id).eq("kind", "satellite").order("created_at", { ascending: false }).limit(1).maybeSingle()
  const satellite: SatelliteView | null = satRow
    ? { ...satRow.manifest, source: satRow.manifest.satellite.source, generatedAt: formatTime(satRow.created_at), intact: manifestHash(satRow.manifest) === satRow.manifest_sha256 }
    : null
  const { count: storyCount } = await supabase.from("reports").select("id", { count: "exact", head: true }).eq("project_id", id).eq("kind", "social")
  const byId = new Map(evidence.map((e) => [e.id, e]))
  const pairs: PairView[] = (pairRows ?? []).flatMap((p) => {
    const b = byId.get(p.before_asset_id), a = byId.get(p.after_asset_id)
    if (!b || !a) return []
    return [{ id: p.id, beforeId: b.id, afterId: a.id, beforeUrl: slideUrl(b.secure_url), afterUrl: slideUrl(a.secure_url), beforeLabel: formatDay(b.taken_at ?? b.created_at), afterLabel: formatDay(a.taken_at ?? a.created_at), distanceM: p.distance_m, daysApart: p.days_apart, summary: p.change_summary }]
  })
  const center = project.center_lat !== null && project.center_lng !== null ? { lat: project.center_lat, lng: project.center_lng } : null
  const radius = project.radius_m ?? 500
  const distance = (a: A) => (center && a.lat != null && a.lng != null ? haversineM(center, { lat: a.lat, lng: a.lng }) : null)

  const points = assets
    .filter((a) => a.lat != null && a.lng != null)
    .map((a) => {
      const d = distance(a)
      return { id: a.id, lat: a.lat!, lng: a.lng!, thumb: thumbUrl(a.secure_url, a.resource_type), label: formatTime(a.taken_at ?? a.created_at), inside: d === null ? null : d <= radius, distanceM: d }
    })
  const outside = points.filter((p) => p.inside === false).length

  const byDay = new Map<string, TimelineDay>()
  for (const a of assets) {
    const when = a.taken_at ?? a.created_at
    const key = dayKey(when)
    const day = byDay.get(key) ?? { day: key, label: formatDay(when).toUpperCase(), items: [] }
    day.items.push({ ...a, time: formatTime(when), approx: !a.taken_at })
    byDay.set(key, day)
  }
  const days = [...byDay.values()].sort((x, y) => x.day.localeCompare(y.day))

  const label = (a: A) => { const d = distance(a); return d === null ? "no GPS" : `${Math.round(d)} m from centre` }
  const assigned: PickerAsset[] = assets.map((a) => ({ asset: a, label: label(a) }))
  const pool: PickerAsset[] = ((free ?? []) as A[])
    .map((a) => ({ a, d: distance(a) }))
    .sort((x, y) => (x.d ?? Infinity) - (y.d ?? Infinity))
    .map(({ a }) => ({ asset: a, label: label(a) }))

  const sections = [
    { id: "overview", label: "Overview" }, { id: "timeline", label: "Timeline" }, { id: "before-after", label: "Before/after" },
    { id: "evidence", label: "Evidence" }, { id: "reports", label: "Reports" }, { id: "campaign", label: "Campaign" },
  ]

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard", label: "Overview" }}
        eyebrow={`Project · ${(project.activity_type ?? "field project").replaceAll("_", " ")}`}
        size="md"
        title={<b className="font-semibold">{project.name}</b>}
        lede={assets.length === 0
          ? "No photos are assigned yet. Add unassigned photos below to start the scorecard."
          : `${assets.length} photo${assets.length === 1 ? "" : "s"}, ${scorecard.verifiedPct ?? 0}% verified or approved, ${scorecard.flaggedOrUnscored} flagged or waiting for review.`}
        meta={`${project.start_date ? `${formatDay(project.start_date)} → ${project.end_date ? formatDay(project.end_date) : "…"} · ` : ""}${assets.length} photos${center ? ` · geofence ${radius} m · ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}` : ""}`}
        actions={
          <>
            <Sheet title="Edit project" trigger="Edit" size="default"><ProjectForm mode="edit" projectId={id} submitLabel="Save changes" initial={project} /></Sheet>
            <Link href={`/capture?project=${id}`} className={buttonVariants({ variant: "outline" })}>Field camera</Link>
            <a href="#reports" className={buttonVariants()}>Reports &amp; PDF</a>
          </>
        }
      />
      {outside > 0 && <InlineNotice tone="warning" className="-mt-6 mb-8">{outside} photo{outside === 1 ? " is" : "s are"} outside the geofence and flagged for review.</InlineNotice>}

      <SectionNav items={sections} />

      <Section id="overview" eyebrow="01 · Overview" title="Impact scorecard">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7"><Scorecard projectId={id} sc={scorecard} rejected={rejected} /></div>
          <div className="lg:col-span-5 max-lg:order-first"><ProjectMap center={center} radiusM={radius} points={points} project={project} /></div>
        </div>
      </Section>

      <Section id="timeline" eyebrow="02 · Timeline" title="Photos by day" action={<span className="text-data text-fg-3">IST</span>}>
        <Timeline days={days} />
      </Section>

      <Section id="before-after" eyebrow="03 · Before / after" title={pairs.length ? `Same spot, ${pairs[0].daysApart} days apart` : "Same spot, later"}>
        <PairsPanel projectId={id} pairs={pairs} />
        {satellite && (
          <div className="mt-10 grid gap-4 border-t border-line pt-8">
            <h3 className="text-title">Satellite cross-check</h3>
            <SatellitePanel view={satellite} />
          </div>
        )}
      </Section>

      <Section
        id="evidence"
        eyebrow="04 · Evidence"
        title={`${assets.length} assigned photos`}
        action={<Sheet title="Add unassigned photos" trigger={`Add unassigned photos (${pool.length})`} size="sm"><AssetPicker projectId={id} action="assign" buttonLabel="Add to project" assets={pool} emptyText="No unassigned photos." /></Sheet>}
      >
        <AssetPicker projectId={id} action="unassign" buttonLabel="Remove from project" assets={assigned} emptyText="No photos assigned yet." />
      </Section>

      <Section id="reports" eyebrow="05 · Reports & verification" title="Sealed snapshots">
        <ReportsPanel projectId={id} reports={reports} />
      </Section>

      <Section id="campaign" eyebrow="06 · Campaign & story" title="Cards for sharing">
        {campaign && <CampaignCards campaign={campaign} />}
        <StoryPanel projectId={id} hasStory={(storyCount ?? 0) > 0} />
        <ReelPanel endpoint={`/api/projects/${id}/reel`} reel={reel} />
      </Section>

      <p className="text-small"><Link href="/dashboard" className="text-accent-ink hover:underline">← Back to overview</Link></p>
    </>
  )
}
