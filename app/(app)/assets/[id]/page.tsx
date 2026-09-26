import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import TrustBadge from "@/components/TrustBadge"
import TrustMeter from "@/components/TrustMeter"
import AuditTrace from "@/components/AuditTrace"
import CustodyStrip from "@/components/CustodyStrip"
import ReviewButtons from "@/components/ReviewButtons"
import AnalyzeOneButton from "@/components/AnalyzeOneButton"
import CopyButton from "@/components/CopyButton"
import ReelPanel, { type ReelView } from "@/components/ReelPanel"
import { TileImage } from "@/components/EvidenceTile"
import { Chip, Eyebrow, KeyValue, PageHeader, Panel } from "@/components/ui/layout"
import { InlineNotice } from "@/components/ui/notice"
import { supabase } from "@/lib/supabase"
import { NA } from "@/lib/copy"
import { formatTime } from "@/lib/dates"
import { formatClock, playerUrl } from "@/lib/video"
import { NO_METADATA_CAP, type TrustFlag } from "@/lib/trust"
import { posterUrl, reelUrl, TIMELAPSE_PACE } from "@/lib/reel"

export const dynamic = "force-dynamic"

type Asset = {
  id: string; public_id: string; secure_url: string; resource_type: string; etag: string | null; phash: string | null
  width: number | null; height: number | null; taken_at: string | null; lat: number | null; lng: number | null; has_exif: boolean
  status: string; tags: string[] | null; caption: string | null; signals: Record<string, unknown> | null
  trust_score: number | null; trust_flags: TrustFlag[] | null; review_status: string; project_id: string | null; created_at: string
  parent_asset_id: string | null; frame_second: number | null; transcript: string | null
  capture_proof: { payload: { accuracyM: number | null; sha256: string; ghostAssetId: string | null }; deviceId: string; verifiedAt: string } | null
}

const shortId = (id: string) => id.split("/").pop() ?? id
const link = "text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink"
const yn = (v: unknown) => (v === true ? "yes" : v === false ? "no" : NA)

export async function generateMetadata(props: PageProps<"/assets/[id]">): Promise<Metadata> {
  const { id } = await props.params
  const { data } = await supabase.from("assets").select("public_id").eq("id", id).maybeSingle()
  return { title: data ? shortId(data.public_id) : "Evidence" }
}

export default async function AssetPage(props: PageProps<"/assets/[id]">) {
  const { id } = await props.params
  const { data: asset } = await supabase.from("assets").select("*").eq("id", id).maybeSingle<Asset>()
  if (!asset) notFound()
  const { data: project } = asset.project_id ? await supabase.from("projects").select("id, name").eq("id", asset.project_id).maybeSingle() : { data: null }
  const { data: parent } = asset.parent_asset_id ? await supabase.from("assets").select("id, public_id, secure_url").eq("id", asset.parent_asset_id).maybeSingle() : { data: null }
  const { data: frames } = asset.resource_type === "video"
    ? await supabase.from("assets").select("id, secure_url, resource_type, frame_second, status, trust_score, trust_flags, review_status").eq("parent_asset_id", asset.id).order("frame_second")
    : { data: null }
  // Ghost Camera: retakes lined up with this photo, and the latest time-lapse of this spot.
  const { data: retakes } = asset.resource_type === "image" ? await supabase.from("assets").select("id").eq("capture_proof->payload->>ghostAssetId", asset.id) : { data: null }
  const { data: lapseRow } = retakes?.length ? await supabase.from("reports").select("manifest, created_at").eq("kind", "timelapse").eq("manifest->>before_id", asset.id).order("created_at", { ascending: false }).limit(1).maybeSingle() : { data: null }
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const lapseSlides = ((lapseRow?.manifest?.slides ?? []) as { slide_public_id: string }[]).map((s) => s.slide_public_id)
  const timelapse: ReelView | null = lapseRow && cloud && lapseSlides.length
    ? { url: reelUrl(cloud, lapseSlides, { pace: TIMELAPSE_PACE }), downloadUrl: reelUrl(cloud, lapseSlides, { pace: TIMELAPSE_PACE, download: "overlook-timelapse" }), seconds: lapseRow.manifest.timelapse.seconds, generatedAt: formatTime(lapseRow.created_at), poster: posterUrl(cloud, lapseSlides[0]) }
    : null
  const second = asset.frame_second !== null ? Number(asset.frame_second) : null
  const flags = asset.trust_flags ?? []
  const sig = (asset.signals ?? {}) as Record<string, unknown>
  const hasSignals = Object.keys(sig).length > 0
  const preview = asset.secure_url.replace("/upload/", "/upload/c_limit,w_900,f_auto,q_auto/")
  const kind = asset.parent_asset_id ? "frame" : asset.resource_type
  const canAnalyze = asset.status === "pending" && (asset.resource_type === "image" || asset.parent_asset_id === null)
  const capped = asset.trust_score !== null && !asset.has_exif && asset.trust_score >= NO_METADATA_CAP

  return (
    <>
      <PageHeader
        back={project ? { href: `/projects/${project.id}`, label: project.name } : { href: "/upload", label: "Uploads" }}
        eyebrow={`Evidence · ${kind}`}
        size="md"
        title={<b className="break-all font-semibold">{shortId(asset.public_id)}</b>}
        lede={asset.caption ?? undefined}
        meta={`${asset.public_id} · uploaded ${formatTime(asset.created_at)} IST`}
      />

      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="grid gap-6 lg:sticky lg:top-24">
            {asset.resource_type === "video" ? (
              <video controls src={asset.secure_url} className="max-h-[72vh] w-full bg-surface-2" />
            ) : (
              // The main image is always full colour: reviewers must see the real photo (DESIGN.md 4.9).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={asset.caption ?? shortId(asset.public_id)} className="max-h-[72vh] w-full bg-surface-2 object-contain object-left" />
            )}
            <div className="grid gap-3">
              <Eyebrow>Chain of custody</Eyebrow>
              <CustodyStrip takenAt={asset.taken_at} hasGps={asset.lat !== null && asset.lng !== null} status={asset.status} tagCount={asset.tags?.length ?? 0} signalCount={hasSignals ? 6 : 0} score={asset.trust_score} reviewStatus={asset.review_status} />
            </div>
          </div>
        </div>

        <div className="grid content-start gap-10 lg:col-span-5">
          <Panel className="grid gap-5 p-6" aria-labelledby="trust-h">
            <div className="grid gap-2">
              <Eyebrow>01 · Trust</Eyebrow>
              <h2 id="trust-h" className="text-h2">How the score was reached</h2>
            </div>
            {asset.trust_score === null ? (
              <InlineNotice>Not scored yet. AI checks run after analysis.</InlineNotice>
            ) : (
              <>
                <div className="flex items-center justify-between"><TrustBadge score={asset.trust_score} reviewStatus={asset.review_status} size="lg" /></div>
                <TrustMeter score={asset.trust_score} capped={capped} />
                <AuditTrace flags={flags} score={asset.trust_score} hasExif={asset.has_exif} reviewStatus={asset.review_status} />
              </>
            )}
            {asset.status !== "done" && asset.trust_score !== null && <p className="text-small">AI checks (photo of a screen, unrelated) run after analysis.</p>}
            <ReviewButtons assetId={asset.id} current={asset.review_status} hotkeys />
            <p className="text-small text-fg-3">Flagged for review, not declared false. A reviewer decides.</p>
            {canAnalyze && <AnalyzeOneButton assetId={asset.id} />}
          </Panel>

          {parent && second !== null && (
            <Panel className="grid gap-3 p-5">
              <p className="text-[15px]">Frame at <b className="font-mono">{formatClock(second)}</b> of the video <Link href={`/assets/${parent.id}`} className={link}>{shortId(parent.public_id)}</Link></p>
              <video controls src={playerUrl(parent.secure_url, second)} className="max-h-80 w-full bg-surface-2" />
              <a href={playerUrl(parent.secure_url, second)} className={`${link} text-[13px]`} target="_blank" rel="noreferrer">Open the original video at {formatClock(second)} ↗</a>
            </Panel>
          )}

          {!!retakes?.length && (
            <Panel className="grid gap-3 p-5">
              <p className="text-[15px]"><b className="font-semibold">{retakes.length}</b> retake{retakes.length === 1 ? "" : "s"} from this exact spot (Ghost Camera)</p>
              <ReelPanel endpoint={`/api/assets/${asset.id}/timelapse`} reel={timelapse} copy={{
                build: "Build time-lapse", rebuild: "Rebuild time-lapse", busy: "Building time-lapse…",
                help: "This photo and every verified retake lined up with it, oldest first, dissolving into each other. Faces are pixelated. No AI credits.",
              }} />
            </Panel>
          )}

          <section className="grid gap-4" aria-labelledby="what-h">
            <Eyebrow>02 · What&apos;s in it</Eyebrow>
            <h2 id="what-h" className="sr-only">What&apos;s in it</h2>
            {asset.caption ? <p>{asset.caption}</p> : <p className="text-small">No caption{asset.status === "done" ? "" : " yet"}.</p>}
            <div className="flex flex-wrap gap-1.5">
              {(asset.tags ?? []).length === 0 && <span className="text-small">No tags.</span>}
              {(asset.tags ?? []).map((t) => <Chip key={t} href={`/search?tag=${t}`}>{t.replaceAll("_", " ")}</Chip>)}
            </div>
            {hasSignals ? (
              <KeyValue rows={[
                ["People working", String(sig.people_working ?? NA)], ["Garbage", yn(sig.garbage_visible)], ["Vegetation", String(sig.vegetation ?? NA)],
                ["Water", yn(sig.water_present)], ["Structure", String(sig.structure_stage ?? NA).replace("_", " ")], ["Safety gear", yn(sig.safety_gear)],
              ]} />
            ) : <p className="text-small">Signals appear after analysis.</p>}
          </section>

          <section className="grid gap-4" aria-labelledby="where-h">
            <Eyebrow>03 · When &amp; where</Eyebrow>
            <h2 id="where-h" className="sr-only">When and where</h2>
            <KeyValue rows={[
              ["Taken", asset.taken_at ? `${formatTime(asset.taken_at)} IST` : "no time metadata"],
              ["GPS", asset.lat !== null && asset.lng !== null ? `${asset.lat.toFixed(5)}, ${asset.lng.toFixed(5)}` : "no location metadata"],
              ["Project", project ? <Link key="p" href={`/projects/${project.id}`} className={link}>{project.name}</Link> : "unassigned"],
              ["Status", asset.status],
              ...(asset.capture_proof ? [["GPS accuracy", asset.capture_proof.payload.accuracyM !== null ? `±${asset.capture_proof.payload.accuracyM} m at capture` : "n/a"] as [string, string]] : []),
            ]} />
            {asset.resource_type === "image" && !asset.parent_asset_id && (
              <Link href={`/capture?ghost=${asset.id}`} className={link + " text-[13px]"}>Retake from this exact spot (opens the field camera with this photo as a ghost) →</Link>
            )}
          </section>

          <section className="grid gap-4" aria-labelledby="src-h">
            <Eyebrow>04 · Source &amp; traceability</Eyebrow>
            <h2 id="src-h" className="sr-only">Source and traceability</h2>
            <KeyValue rows={[
              ["Public ID", <span key="i">{asset.public_id}<CopyButton value={asset.public_id} label="Copy public ID" /></span>],
              ["Original", <a key="o" href={asset.secure_url} className={link} target="_blank" rel="noreferrer">Open original ↗</a>],
              ...(asset.capture_proof ? [
                ["Live capture", <span key="c">Signed on device <span className="text-hash">{asset.capture_proof.deviceId}</span> · {formatTime(asset.capture_proof.verifiedAt)} IST</span>] as [string, React.ReactNode],
                ["Signed SHA-256", <span key="s" className="text-hash">{asset.capture_proof.payload.sha256}<CopyButton value={asset.capture_proof.payload.sha256} label="Copy signed hash" /></span>] as [string, React.ReactNode],
                ...(asset.capture_proof.payload.ghostAssetId ? [["Lined up with", <Link key="g" href={`/assets/${asset.capture_proof.payload.ghostAssetId}`} className={link}>the earlier photo (ghost) ↗</Link>] as [string, React.ReactNode]] : []),
              ] : []),
              ["etag", asset.etag ? <span key="e" className="text-hash">{asset.etag}<CopyButton value={asset.etag} label="Copy etag" /></span> : "n/a"],
              ["pHash", asset.phash ? <span key="h" className="text-hash">{asset.phash}<CopyButton value={asset.phash} label="Copy perceptual hash" /></span> : "n/a"],
            ]} />
          </section>
        </div>
      </div>

      {asset.resource_type === "video" && (
        <div className="mt-16 grid gap-10">
          <section className="grid gap-4" aria-labelledby="tr-h">
            <div className="grid gap-2"><Eyebrow>05 · Transcript</Eyebrow><h2 id="tr-h" className="text-h2">What is said</h2></div>
            {asset.transcript
              ? <p className="max-h-80 max-w-[68ch] overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-surface-1 p-4 text-[15px] leading-[26px]">{asset.transcript}</p>
              : <p className="text-small">{asset.status === "done" ? "No speech was found in this video." : "Not transcribed yet. Run the analysis from the Upload page."}</p>}
          </section>
          <section className="grid gap-4" aria-labelledby="kf-h">
            <div className="grid gap-2"><Eyebrow>06 · Key frames</Eyebrow><h2 id="kf-h" className="text-h2">{frames?.length ?? 0} frames</h2></div>
            <ul className="flex list-none gap-4 overflow-x-auto p-0 pb-2">
              {(frames ?? []).map((f) => (
                <li key={f.id} className="grid w-40 shrink-0 gap-2">
                  <Link href={`/assets/${f.id}`} className="tile block"><TileImage asset={{ ...f, parent_asset_id: asset.id }} sizeClass="aspect-[4/3]" /></Link>
                  <TrustBadge score={f.trust_score} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  )
}
