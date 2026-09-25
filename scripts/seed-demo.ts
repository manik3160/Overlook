// Rehearsal dataset for the demo flow (CLAUDE.md §10): a cleanup project with before/after photos,
// a second project, and the planted problems (exact duplicate, re-used copy, far-away photo, wrong date,
// no metadata, photo of a screen). Uses public Cloudinary sample images, NOT real field photos.
//
//   npm run seed                    (needs `npm run dev` running)
//   npm run seed -- --reset         remove earlier demo data first
//   npm run seed -- --unassigned    do not create projects (to demo the auto-suggestion flow)
//   npm run seed -- --reset-only    just remove demo data
//
// The captions/signals below are FABRICATED for rehearsal (public ids live under evidence/demo/, project names end in "(demo)") and are stored in the analysis cache with the same
// keys the real pipeline uses, so pressing "Analyze" finishes almost instantly and spends no AI Vision units.
import { createHash } from "node:crypto"
import { resolve } from "node:path"
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })
const APP = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
const args = new Set(process.argv.slice(2))

const SITE = { lat: 28.9931, lng: 77.0151 }, DELHI = { lat: 28.6139, lng: 77.209 }, JAIPUR = { lat: 26.9124, lng: 75.7873 }
const sample = (p: string, transform = "") => `https://res.cloudinary.com/demo/image/upload/${transform}samples/${p}.jpg`
const sig = (o: object = {}) => ({ people_working: 0, water_present: false, garbage_visible: false, vegetation: "none", structure_stage: "none", safety_gear: false, ...o })
const ok = { photo_of_screen_or_print: false, people_doing_physical_work: false, unrelated_to_field_work: false }

type Item = {
  name: string; src: string; at: { lat: number; lng: number } | null; time: string | null; project: "A" | "B"
  caption: string; signals: object; tags: string[]; checks?: object; skipCache?: boolean
}
const off = (dLat: number, dLng: number) => ({ lat: SITE.lat + dLat, lng: SITE.lng + dLng })
const ITEMS: Item[] = [
  // Project A: 3 before + 3 after at the site
  { name: "before-1", src: sample("landscapes/beach-boat"), at: off(0, 0), time: "2026-09-01T04:00:00Z", project: "A", caption: "A boat on a beach, standing in for the littered site.", signals: sig({ garbage_visible: true, water_present: true }), tags: ["water_body", "garbage_present", "cleanup_drive"] },
  { name: "before-2", src: sample("animals/cat"), at: off(0.0002, 0), time: "2026-09-01T05:00:00Z", project: "A", caption: "A cat near scattered waste.", signals: sig({ garbage_visible: true }), tags: ["garbage_present", "cleanup_drive"] },
  { name: "before-3", src: sample("people/smiling-man"), at: off(0, 0.0002), time: "2026-09-02T04:30:00Z", project: "A", caption: "A volunteer beside a heap of litter.", signals: sig({ garbage_visible: true, people_working: 1 }), tags: ["garbage_present", "cleanup_drive"] },
  { name: "after-1", src: sample("landscapes/nature-mountains"), at: off(0.00005, 0), time: "2026-09-15T04:00:00Z", project: "A", caption: "A clean meadow beside the water.", signals: sig({ vegetation: "dense", water_present: true }), tags: ["water_body", "vegetation"] },
  { name: "after-2", src: sample("people/kitchen-bar"), at: off(0.00021, 0), time: "2026-09-15T05:00:00Z", project: "A", caption: "Volunteers gathered in the cleared area.", signals: sig({ vegetation: "sparse", people_working: 2 }), tags: ["community_meeting"] },
  { name: "after-3", src: sample("landscapes/girl-urban-view"), at: off(0, 0.00019), time: "2026-09-16T04:30:00Z", project: "A", caption: "A child stands on the levelled ground.", signals: sig({ vegetation: "dense", safety_gear: true }), tags: ["vegetation"] },
  // Project B: a second project (also the source of the re-used photo's "different project")
  { name: "delhi-1", src: sample("food/spices"), at: DELHI, time: "2026-09-11T04:30:00Z", project: "B", caption: "Colourful spices at a stall.", signals: sig(), tags: ["community_meeting"] },
  { name: "delhi-2", src: sample("food/dessert"), at: { lat: DELHI.lat + 0.0004, lng: DELHI.lng }, time: "2026-09-12T05:30:00Z", project: "B", caption: "A dessert on a plate.", signals: sig(), tags: ["community_meeting"] },
  // Planted problems
  { name: "fake-duplicate", src: sample("landscapes/beach-boat"), at: off(0, 0), time: "2026-09-03T04:00:00Z", project: "A", caption: "", signals: sig(), tags: [], skipCache: true }, // byte-identical re-upload: analysis is copied from its twin
  { name: "fake-reused", src: sample("landscapes/nature-mountains", "w_600,q_50/"), at: { lat: DELHI.lat + 0.0002, lng: DELHI.lng }, time: "2026-09-12T06:00:00Z", project: "B", caption: "A meadow beside the water (re-compressed copy of an earlier photo).", signals: sig({ vegetation: "dense", water_present: true }), tags: ["water_body", "vegetation"] },
  { name: "fake-far", src: sample("landscapes/architecture-signs"), at: JAIPUR, time: "2026-09-14T04:00:00Z", project: "A", caption: "Street signs on a building, taken hundreds of km from the site.", signals: sig(), tags: ["cleanup_drive"] },
  { name: "fake-old", src: sample("animals/three-dogs"), at: off(0.0003, 0.0002), time: "2026-06-01T04:00:00Z", project: "A", caption: "Three dogs, photographed months before the project.", signals: sig(), tags: ["cleanup_drive"] },
  { name: "fake-nometa", src: sample("coffee"), at: null, time: null, project: "A", caption: "A cup of coffee, forwarded with no location or time.", signals: sig(), tags: ["cleanup_drive"] },
  { name: "fake-screen", src: resolve("scripts/demo-assets/screen-photo.jpg"), at: off(0.0004, -0.0003), time: "2026-09-15T09:30:00Z", project: "A", caption: "A laptop screen showing a beach photo.", signals: sig({ water_present: true }), tags: ["water_body"], checks: { ...ok, photo_of_screen_or_print: true, unrelated_to_field_work: true } },
]

const api = async (path: string, body?: object) => {
  const res = await fetch(APP + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) })
  const json = await res.json()
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${json.error ?? JSON.stringify(json)}`)
  return json
}
// Same key the pipeline uses (lib/cache.ts) so seeded results count as cache hits.
const cacheKey = (kind: string, assetId: string, input: unknown) => createHash("sha256").update(`${kind}|${assetId}|${JSON.stringify(input)}`).digest("hex")

async function reset() {
  const { data: projects } = await sb.from("projects").select("id").like("name", "% (demo)")
  const pids = (projects ?? []).map((p) => p.id as string)
  if (pids.length) {
    const { data: reports } = await sb.from("reports").select("id, pdf_public_id").in("project_id", pids)
    for (const r of reports ?? []) if (r.pdf_public_id) await cloudinary.uploader.destroy(r.pdf_public_id, { resource_type: "raw" })
    await sb.from("reports").delete().in("project_id", pids)
    await sb.from("projects").delete().in("id", pids) // cascades pairs
  }
  const { data: assets } = await sb.from("assets").select("id, public_id").like("public_id", "evidence/demo/%")
  for (const a of assets ?? []) await cloudinary.uploader.destroy(a.public_id)
  if (assets?.length) await sb.from("assets").delete().in("id", assets.map((a) => a.id))
  console.log(`Removed demo data: ${assets?.length ?? 0} assets, ${pids.length} projects.`)
}

async function seed() {
  const ids: Record<string, string> = {}
  for (const it of ITEMS) {
    const up = await cloudinary.uploader.upload(it.src, { public_id: `evidence/demo/${it.name}`, overwrite: true, phash: true })
    const { asset } = await api("/api/assets", {
      public_id: up.public_id, asset_id: up.asset_id, resource_type: "image", secure_url: up.secure_url, etag: up.etag, phash: up.phash ?? null,
      width: up.width, height: up.height, taken_at: it.time, lat: it.at?.lat ?? null, lng: it.at?.lng ?? null, has_exif: it.time !== null || it.at !== null,
    })
    ids[it.name] = asset.id
    if (!it.skipCache) {
      await sb.from("analyses").upsert([
        { asset_id: asset.id, kind: "gemini_analysis", input_hash: cacheKey("gemini_analysis", asset.id, { model: "flash", v: 1 }), result: { caption: it.caption, signals: it.signals, checks: it.checks ?? ok } },
        { asset_id: asset.id, kind: "ai_vision_tagging", input_hash: cacheKey("ai_vision_tagging", asset.id, { v: 1 }), result: { tags: it.tags, unitsUsed: null, unitsRemaining: null } },
      ], { onConflict: "asset_id,kind,input_hash" })
    }
    console.log(`  uploaded ${it.name}`)
  }
  if (args.has("--unassigned")) {
    await api("/api/trust/recompute")
    return console.log("Seeded unassigned: open the dashboard to see the suggested projects.")
  }
  const pick = (p: "A" | "B") => ITEMS.filter((i) => i.project === p).map((i) => ids[i.name])
  const a = await api("/api/projects", { name: "Riverside Cleanup Drive (demo)", description: "Volunteers cleared litter from the riverside lane.", activity_type: "cleanup", center_lat: SITE.lat, center_lng: SITE.lng, radius_m: 300, start_date: "2026-09-01", end_date: "2026-09-16", asset_ids: pick("A") })
  const b = await api("/api/projects", { name: "Delhi Market Survey (demo)", activity_type: "survey", center_lat: DELHI.lat, center_lng: DELHI.lng, radius_m: 300, start_date: "2026-09-10", end_date: "2026-09-13", asset_ids: pick("B") })
  await api("/api/trust/recompute")
  const pairs = await api(`/api/projects/${a.project.id}/pairs`)
  console.log(`\nSeeded ${ITEMS.length} photos, 2 projects, ${pairs.pairs} before/after pairs.\n  ${APP}/projects/${a.project.id}\n  ${APP}/projects/${b.project.id}\n  ${APP}/review   (6 planted problems should be flagged)`)
}

async function main() {
  const r = await fetch(`${APP}/api/analyze/status`).catch(() => null)
  if (!r?.ok) throw new Error(`The app is not reachable at ${APP}. Start it with "npm run dev" (or set APP_URL) and try again.`)
  if (args.has("--reset") || args.has("--reset-only")) await reset()
  if (!args.has("--reset-only")) await seed()
}
main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1) })
