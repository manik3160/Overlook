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
import GapsPanel from "@/components/GapsPanel"
import CopyButton from "@/components/CopyButton"
import MilestonesPanel from "@/components/MilestonesPanel"
import ClaimsPanel, { type ClaimCheckView } from "@/components/ClaimsPanel"
import { loadMilestones } from "@/lib/milestones-data"
import { templateMilestones } from "@/lib/milestones"
import { suggestCompliance } from "@/lib/compliance"
import { costPerOutcome, inr } from "@/lib/money"
import { isVerified } from "@/lib/signals"
import { TAXONOMY } from "@/lib/taxonomy"
import { loadGaps, shotListQr, shotListUrl } from "@/lib/gaps-data"
import PairsPanel, { type PairView } from "@/components/PairsPanel"
import ProjectTabs, { tabHref, toTab } from "@/components/ProjectTabs"
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
  const tab = toTab((await props.searchParams).tab)
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
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
  const [gaps, gapsQr, pay] = await Promise.all([loadGaps(id), shotListQr(id), loadMilestones(id)])
  const { data: claimRows } = await supabase.from("reports").select("id, created_at, summary:manifest->summary, text:manifest->>input_text").eq("project_id", id).eq("kind", "claims").order("created_at", { ascending: false }).limit(5)
  const claimChecks: ClaimCheckView[] = ((claimRows ?? []) as { id: string; created_at: string; summary: { supported: number; partly: number; noEvidence: number }; text: string }[])
    .map((r) => ({ id: r.id, checkedAt: formatTime(r.created_at), ...r.summary, snippet: r.text.slice(0, 60) }))
  // Cost per verified outcome (only when a grant amount is set; migration 0004)
  const verifiedIds = new Set(evidence.filter((e) => e.resource_type === "image" && isVerified(e)).map((e) => e.id))
  const verifiedSpots = (pairRows ?? []).filter((p) => verifiedIds.has(p.before_asset_id) && verifiedIds.has(p.after_asset_id)).length
  const grant = typeof project.grant_inr === "number" ? project.grant_inr : project.grant_inr ? Number(project.grant_inr) : null
  const cost = grant ? costPerOutcome({ grantInr: grant, verifiedPhotos: verifiedIds.size, verifiedSpots, releasablePct: pay?.statuses.length ? pay.releasable : null }) : null
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
            <Link href={tabHref(id, "reports")} scroll={false} className={buttonVariants()}>Reports &amp; PDF</Link>
          </>
        }
      />
      {outside > 0 && <InlineNotice tone="warning" className="-mt-6 mb-8">{outside} photo{outside === 1 ? " is" : "s are"} outside the geofence and flagged for review.</InlineNotice>}

      <ProjectTabs projectId={id} active={tab} counts={{ "before-after": pairs.length, evidence: assets.length, reports: reports.length }} />

      {tab === "overview" && (
      <Section id="overview" eyebrow="01 · Overview" title="Impact scorecard">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7"><Scorecard projectId={id} sc={scorecard} rejected={rejected} /></div>
          <div className="lg:col-span-5 max-lg:order-first"><ProjectMap center={center} radiusM={radius} points={points} project={project} /></div>
        </div>
        {cost && grant && (
          <div className="mt-10 grid gap-3 border-t border-line pt-8">
            <h3 className="text-title">Cost per verified outcome</h3>
            <p className="text-small">Grant {inr(grant)}{project.organization ? ` to ${project.organization}` : ""}. Counted only from verified photos (trust 80+ or approved).</p>
            <div className="flex flex-wrap gap-x-10 gap-y-3">
              <p><b className="text-data-xl">{cost.perPhoto !== null ? inr(cost.perPhoto) : "n/a"}</b><br /><span className="text-small">per verified photo ({verifiedIds.size})</span></p>
              <p><b className="text-data-xl">{cost.perSpot !== null ? inr(cost.perSpot) : "n/a"}</b><br /><span className="text-small">per verified before/after spot ({verifiedSpots})</span></p>
              {cost.releasableInr !== null && <p><b className="text-data-xl">{inr(cost.releasableInr)}</b><br /><span className="text-small">ready to release on proof ({pay?.releasable}%)</span></p>}
            </div>
          </div>
        )}
        {gaps && (
          <div className="mt-10 grid gap-4 border-t border-line pt-8">
            <h3 className="text-title">Evidence gaps: what is missing</h3>
            <GapsPanel gaps={gaps} qrDataUrl={gapsQr} listUrl={shotListUrl(id)} />
          </div>
        )}
      </Section>
      )}

      {tab === "timeline" && (
      <Section id="timeline" eyebrow="02 · Timeline" title="Photos by day" action={<span className="text-data text-fg-3">IST</span>}>
        <Timeline days={days} />
      </Section>
      )}

      {tab === "before-after" && (
      <Section id="before-after" eyebrow="03 · Before / after" title={pairs.length ? `Same spot, ${pairs[0].daysApart} days apart` : "Same spot, later"}>
        <PairsPanel projectId={id} pairs={pairs} />
        {satellite && (
          <div className="mt-10 grid gap-4 border-t border-line pt-8">
            <h3 className="text-title">Satellite cross-check</h3>
            <SatellitePanel view={satellite} />
          </div>
        )}
      </Section>
      )}

      {tab === "evidence" && (
      <Section
        id="evidence"
        eyebrow="04 · Evidence"
        title={`${assets.length} assigned photos`}
        action={<Sheet title="Add unassigned photos" trigger={`Add unassigned photos (${pool.length})`} size="sm"><AssetPicker projectId={id} action="assign" buttonLabel="Add to project" assets={pool} emptyText="No unassigned photos." /></Sheet>}
      >
        <AssetPicker projectId={id} action="unassign" buttonLabel="Remove from project" assets={assigned} emptyText="No photos assigned yet." />
      </Section>
      )}

      {tab === "reports" && (
      <Section id="reports" eyebrow="05 · Reports & verification" title="Sealed snapshots">
        {pay && (
          <div className="mb-10 grid gap-4 border-b border-line pb-8">
            <h3 className="text-title">Pay-on-Proof: payment stages</h3>
            <MilestonesPanel
              projectId={id}
              statuses={pay.statuses}
              releasable={pay.releasable}
              certificates={pay.certificates}
              template={templateMilestones(project.activity_type, project.start_date, project.end_date)}
              tagOptions={TAXONOMY.map((t) => t.name)}
            />
          </div>
        )}
        <div className="mb-10 grid gap-4 border-b border-line pb-8">
          <h3 className="text-title">Claim Checker: does the evidence back the report?</h3>
          <ClaimsPanel projectId={id} recent={claimChecks} />
        </div>
        <ReportsPanel projectId={id} reports={reports} suggested={suggestCompliance(project.activity_type)} />
      </Section>
      )}

      {tab === "campaign" && (
      <Section id="campaign" eyebrow="06 · Campaign & story" title="Cards for sharing">
        {campaign && <CampaignCards campaign={campaign} />}
        <StoryPanel projectId={id} hasStory={(storyCount ?? 0) > 0} />
        <ReelPanel endpoint={`/api/projects/${id}/reel`} reel={reel} />
        <div className="grid gap-2">
          <h3 className="text-title">Live donor link</h3>
          <p className="text-small">A public page that updates as new evidence is verified: numbers, payment stages, latest photos (faces pixelated), reel and satellite view. Share it, or embed it on a donation page.</p>
          <p className="text-data flex flex-wrap items-center gap-2 break-all"><a href={`/live/${id}`} target="_blank" rel="noreferrer" className="text-accent-ink underline">{`${appUrl}/live/${id}`}</a><CopyButton value={`${appUrl}/live/${id}`} label="Copy live link" /></p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <p className="flex flex-wrap items-center gap-3"><img src={`/badge/${id}`} alt="Verified by Overlook badge" height={20} /><span className="text-small">Website badge (live verified share, links to the live page)</span><CopyButton value={`<a href="${appUrl}/live/${id}"><img src="${appUrl}/badge/${id}" alt="Verified by Overlook" height="20"></a>`} label="Copy badge code" /></p>
          <p className="text-data flex flex-wrap items-center gap-2 break-all text-fg-3">Embed: {`<iframe src="${appUrl}/live/${id}?embed=1" width="100%" height="900"></iframe>`}<CopyButton value={`<iframe src="${appUrl}/live/${id}?embed=1" width="100%" height="900" style="border:0"></iframe>`} label="Copy embed code" /></p>
        </div>
      </Section>
      )}

      <p className="text-small"><Link href="/dashboard" className="text-accent-ink hover:underline">← Back to overview</Link></p>
    </>
  )
}
