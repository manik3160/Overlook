import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { supabase } from "@/lib/supabase"
import { cloudinary } from "@/lib/cloudinary"
import { manifestHash } from "@/lib/manifest"
import { loadCampaign } from "@/lib/campaign-data"
import { formatDay } from "@/lib/dates"
import { planReel, reelSeconds, reelUrl, slideUrl, type ReelPhoto } from "@/lib/reel"
import type { EvidenceRow } from "@/lib/project-data"

export const maxDuration = 60

const toPhoto = (r: EvidenceRow): ReelPhoto => ({ publicId: r.public_id, takenAt: r.taken_at, peopleWorking: r.signals?.people_working ?? 0, trust: r.trust_score ?? 0 })

// Builds the highlight reel from VERIFIED photos only (no AI calls): stores each finished slide image in
// Cloudinary, warms the spliced video, and records a hashed 'reel' manifest listing every source photo.
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/reel">) {
  const { id } = await ctx.params
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloud) return NextResponse.json({ error: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set" }, { status: 500 })
  const c = await loadCampaign(id)
  if (!c) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const images = c.verifiedRows.filter((r) => r.resource_type === "image")
  const slides = planReel({
    projectName: c.project.name,
    verifiedCount: c.verifiedRows.length,
    headline: c.headline.en,
    pair: c.pair ? { before: toPhoto(c.pair.before), after: toPhoto(c.pair.after) } : null,
    photos: images.map(toPhoto),
    formatDay,
  })
  if (slides.length === 0) return NextResponse.json({ error: "No verified photos yet: a reel needs at least one photo with trust 80+ or approved." }, { status: 422 })

  // New public_ids every time: Cloudinary caches the spliced video by URL, so reusing ids would serve a stale reel.
  const stamp = Date.now()
  const stored = await Promise.all(
    slides.map(async (slide, i) => {
      const source = slideUrl(cloud, slide)
      const up = await cloudinary.uploader.upload(source, { public_id: `overlook/reels/${id}/${stamp}-${i}`, overwrite: true })
      return { kind: slide.kind, source_public_id: slide.kind === "photo" ? slide.publicId : slide.background, transformation_url: source, slide_public_id: up.public_id as string }
    }),
  ).catch((err: unknown) => err instanceof Error ? err : new Error(String(err)))
  if (stored instanceof Error) return NextResponse.json({ error: `Could not prepare slides: ${stored.message}` }, { status: 502 })

  const slideIds = stored.map((s) => s.slide_public_id)
  const url = reelUrl(cloud, slideIds)
  // Generate both versions now (about 15 s each, run in parallel), so neither the first viewer nor the
  // first Download click waits, and a broken URL is caught here.
  const warmed = await Promise.all([url, reelUrl(cloud, slideIds, { download: "overlook-reel" })].map((u) => fetch(u)))
  const failed = warmed.find((r) => !r.ok)
  if (failed) return NextResponse.json({ error: `Cloudinary could not build the reel (${failed.status}): ${failed.headers.get("x-cld-error") ?? "unknown error"}` }, { status: 502 })

  const { data: previous } = await supabase.from("reports").select("id, manifest").eq("project_id", id).eq("kind", "reel")
  const reelId = randomUUID()
  const manifest = {
    schema: "overlook-reel/1",
    reel: { id: reelId, generated_at: new Date().toISOString(), url, seconds: reelSeconds(slideIds.length) },
    project: { id: c.project.id, name: c.project.name },
    slides: stored,
    sources: [...new Set(stored.map((s) => s.source_public_id))].sort(),
  }
  const { error } = await supabase.from("reports").insert({ id: reelId, project_id: id, kind: "reel", manifest, manifest_sha256: manifestHash(manifest) })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Only one reel per project: drop the old record and its slide images once the new one is saved.
  const oldIds = (previous ?? []).flatMap((r) => (r.manifest?.slides ?? []).map((s: { slide_public_id: string }) => s.slide_public_id))
  if (oldIds.length) await cloudinary.api.delete_resources(oldIds).catch(() => null)
  if (previous?.length) await supabase.from("reports").delete().in("id", previous.map((r) => r.id))

  return NextResponse.json({ reelId, url, slideIds, seconds: manifest.reel.seconds })
}
