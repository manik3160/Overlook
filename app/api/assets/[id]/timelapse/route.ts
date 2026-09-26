import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { supabase } from "@/lib/supabase"
import { cloudinary } from "@/lib/cloudinary"
import { manifestHash } from "@/lib/manifest"
import { formatDay } from "@/lib/dates"
import { VERIFIED_SCORE } from "@/lib/signals"
import { planTimelapse, reelSeconds, reelUrl, slideUrl, TIMELAPSE_PACE } from "@/lib/reel"

export const maxDuration = 60

type Row = { id: string; public_id: string; taken_at: string | null; trust_score: number | null; review_status: string; project_id: string | null; resource_type: string }
const COLS = "id, public_id, taken_at, trust_score, review_status, project_id, resource_type"
const MAX_DEPTH = 10

// Time-lapse of one spot: this photo plus every Ghost Camera retake lined up with it (and retakes of those).
// Verified photos only, faces pixelated, no AI calls. Stored as a hashed 'timelapse' report, one per photo.
export async function POST(_request: Request, ctx: RouteContext<"/api/assets/[id]/timelapse">) {
  const { id } = await ctx.params
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloud) return NextResponse.json({ error: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set" }, { status: 500 })
  const { data: root } = await supabase.from("assets").select(COLS).eq("id", id).maybeSingle<Row>()
  if (!root || root.resource_type !== "image") return NextResponse.json({ error: "Photo not found" }, { status: 404 })

  // Walk the ghost links outwards: retakes of this photo, then retakes of those retakes.
  const chain: Row[] = [root]
  let frontier = [root.id]
  for (let depth = 0; depth < MAX_DEPTH && frontier.length; depth++) {
    const { data } = await supabase.from("assets").select(COLS).in("capture_proof->payload->>ghostAssetId", frontier)
    const fresh = ((data ?? []) as Row[]).filter((r) => !chain.some((c) => c.id === r.id))
    chain.push(...fresh)
    frontier = fresh.map((r) => r.id)
  }
  // same rule as everywhere else: approved, or trust 80+ (rejected never)
  const usable = chain.filter((r) => r.review_status !== "rejected" && (r.review_status === "approved" || (r.trust_score ?? -1) >= VERIFIED_SCORE))
  const slides = planTimelapse(usable.map((r) => ({ publicId: r.public_id, takenAt: r.taken_at })), formatDay)
  if (slides.length === 0) {
    return NextResponse.json({ error: `A time-lapse needs this photo and at least one verified retake from the same spot (found ${usable.length} verified of ${chain.length}). Use "Retake from this exact spot".` }, { status: 422 })
  }

  const stamp = Date.now()
  const stored = await Promise.all(
    slides.map(async (slide, i) => {
      const source = slideUrl(cloud, slide)
      const up = await cloudinary.uploader.upload(source, { public_id: `overlook/timelapse/${id}/${stamp}-${i}`, overwrite: true })
      return { source_public_id: slide.kind === "photo" ? slide.publicId : "", transformation_url: source, slide_public_id: up.public_id as string }
    }),
  ).catch((err: unknown) => (err instanceof Error ? err : new Error(String(err))))
  if (stored instanceof Error) return NextResponse.json({ error: `Could not prepare frames: ${stored.message}` }, { status: 502 })

  const slideIds = stored.map((s) => s.slide_public_id)
  const url = reelUrl(cloud, slideIds, { pace: TIMELAPSE_PACE })
  const warmed = await Promise.all([url, reelUrl(cloud, slideIds, { pace: TIMELAPSE_PACE, download: "overlook-timelapse" })].map((u) => fetch(u)))
  const failed = warmed.find((r) => !r.ok)
  if (failed) return NextResponse.json({ error: `Cloudinary could not build the time-lapse (${failed.status}): ${failed.headers.get("x-cld-error") ?? "unknown error"}` }, { status: 502 })

  const { data: previous } = await supabase.from("reports").select("id, manifest").eq("kind", "timelapse").eq("manifest->>before_id", id)
  const reportId = randomUUID()
  const manifest = {
    schema: "overlook-timelapse/1",
    timelapse: { id: reportId, generated_at: new Date().toISOString(), url, seconds: reelSeconds(slideIds.length, TIMELAPSE_PACE) },
    before_id: id,
    slides: stored,
    sources: stored.map((s) => s.source_public_id),
  }
  const { error } = await supabase.from("reports").insert({ id: reportId, project_id: root.project_id, kind: "timelapse", manifest, manifest_sha256: manifestHash(manifest) })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const oldIds = (previous ?? []).flatMap((r) => (r.manifest?.slides ?? []).map((s: { slide_public_id: string }) => s.slide_public_id))
  if (oldIds.length) await cloudinary.api.delete_resources(oldIds).catch(() => null)
  if (previous?.length) await supabase.from("reports").delete().in("id", previous.map((r) => r.id))
  return NextResponse.json({ reportId, url, seconds: manifest.timelapse.seconds })
}
