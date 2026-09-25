// Real, openly licensed field photos from Wikimedia Commons (no fabricated captions or signals).
// Uploads them as PENDING: press "Analyze" in the app to run the real AI pipeline (spends AI Vision units).
//
//   npm run seed:real                    (APP_URL=... for a deployed app; local dev server otherwise)
//   npm run seed:real -- --reset-only    remove this data again
//
// Project A: wildfire-debris cleanup at Upward Bound Camp, Oregon (real GPS + real dates, 83 days apart).
// Project B: Oneness Vann tree plantation, India (real photos; Commons has no GPS/time for them, so they
//            are honestly "no metadata"). Plus 4 planted problems built from the same real photos.
// Credits: see README "Sample data credits".
import { resolve } from "node:path"
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })
const APP = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
const args = new Set(process.argv.slice(2))

const commons = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=2000`
const oregon = (n: string, kind: string) => commons(`Drone view of Upward Bound Camp - ${kind} (${n}).jpg`)
const vann = (s: string) => commons(`Project- Oneness Vann Site an Tree Cluster Created by Sant Nirankari Mission ${s}.jpg`)
// Commons shows Oregon DOT drone times as local (PDT, UTC-7).
const pdt = (local: string) => new Date(`${local}:00-07:00`).toISOString()

type Item = { name: string; src: string; project: "A" | "B"; at: { lat: number; lng: number } | null; time: string | null; shrink?: boolean }
const ITEMS: Item[] = [
  // Project A: before (9 Apr 2021)
  { name: "a-before-1", src: oregon("51512388850", "Before cleanup"), project: "A", at: { lat: 44.750441, lng: -122.41485 }, time: pdt("2021-04-09T13:03") },
  { name: "a-before-2", src: oregon("51511681598", "Before cleanup"), project: "A", at: { lat: 44.7514, lng: -122.416206 }, time: pdt("2021-04-09T13:04") },
  { name: "a-before-3", src: commons("Drone view of Gates, Oregon near Upward Bound Camp (51512387830).jpg"), project: "A", at: { lat: 44.750261, lng: -122.414514 }, time: pdt("2021-04-09T13:05") },
  { name: "a-before-4", src: commons("Debris from a burned building (51510654112).jpg"), project: "A", at: { lat: 44.750183, lng: -122.415803 }, time: pdt("2021-04-09T15:25") },
  // Project A: after (1 Jul 2021)
  { name: "a-after-1", src: oregon("51511457316", "After cleanup"), project: "A", at: { lat: 44.750455, lng: -122.414976 }, time: pdt("2021-07-01T13:09") },
  { name: "a-after-2", src: oregon("51512167889", "After cleanup"), project: "A", at: { lat: 44.751363, lng: -122.416028 }, time: pdt("2021-07-01T13:12") },
  // Project B: India plantation, no location/time in the files
  { name: "b-planting", src: vann("(A view of planting trees)"), project: "B", at: null, time: null },
  { name: "b-canopy", src: vann("(Canopy of Trees)"), project: "B", at: null, time: null },
  { name: "b-mini-forest", src: vann("(Changing in a mini forest)"), project: "B", at: null, time: null },
  { name: "b-nursery", src: vann("(Creating free nursery for gifting plants )"), project: "B", at: null, time: null },
  { name: "b-water", src: vann("(creating water bodies)"), project: "B", at: null, time: null },
  { name: "b-spacing", src: vann("(on distance of 4x4fts)"), project: "B", at: null, time: null },
  { name: "b-height", src: vann("(Height of Trees with in One Year)"), project: "B", at: null, time: null },
  // Planted problems (built from the real photos above, so they are realistic)
  { name: "fake-duplicate", src: oregon("51512388850", "Before cleanup"), project: "A", at: { lat: 44.750441, lng: -122.41485 }, time: pdt("2021-04-09T13:03") }, // same bytes uploaded again
  { name: "fake-reused", src: oregon("51511457316", "After cleanup"), project: "B", at: null, time: null, shrink: true }, // recompressed copy filed under the India project
  { name: "fake-far", src: commons("Street views from car in Hyderabad (34538).jpg"), project: "A", at: { lat: 17.4191, lng: 78.3548 }, time: "2025-10-31T06:30:00Z" }, // real GPS, 12,000 km away
  { name: "fake-screen", src: resolve("scripts/demo-assets/screen-photo.jpg"), project: "A", at: { lat: 44.7506, lng: -122.4152 }, time: pdt("2021-06-10T11:00") }, // a photo of a laptop screen
]

const api = async (path: string, body?: object) => {
  const res = await fetch(APP + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) })
  const json = await res.json()
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${json.error ?? JSON.stringify(json)}`)
  return json
}

async function reset() {
  const { data: projects } = await sb.from("projects").select("id").like("name", "% (public photos)")
  const pids = (projects ?? []).map((p) => p.id as string)
  if (pids.length) {
    const { data: reports } = await sb.from("reports").select("id, pdf_public_id").in("project_id", pids)
    for (const r of reports ?? []) if (r.pdf_public_id) await cloudinary.uploader.destroy(r.pdf_public_id, { resource_type: "raw" })
    await sb.from("reports").delete().in("project_id", pids)
    await sb.from("projects").delete().in("id", pids)
  }
  const { data: assets } = await sb.from("assets").select("id, public_id").like("public_id", "evidence/real/%")
  for (const a of assets ?? []) await cloudinary.uploader.destroy(a.public_id)
  if (assets?.length) await sb.from("assets").delete().in("id", assets.map((a) => a.id))
  console.log(`Removed real-photo data: ${assets?.length ?? 0} assets, ${pids.length} projects.`)
}

async function seed() {
  const ids: Record<string, string> = {}
  for (const it of ITEMS) {
    const up = await cloudinary.uploader.upload(it.src, { public_id: `evidence/real/${it.name}`, overwrite: true, phash: true, ...(it.shrink ? { transformation: [{ width: 600, quality: 50 }] } : {}) })
    const { asset } = await api("/api/assets", {
      public_id: up.public_id, asset_id: up.asset_id, resource_type: "image", secure_url: up.secure_url, etag: up.etag, phash: up.phash ?? null,
      width: up.width, height: up.height, taken_at: it.time, lat: it.at?.lat ?? null, lng: it.at?.lng ?? null, has_exif: it.time !== null || it.at !== null,
    })
    ids[it.name] = asset.id
    console.log(`  uploaded ${it.name}`)
  }
  const pick = (p: "A" | "B") => ITEMS.filter((i) => i.project === p).map((i) => ids[i.name])
  const a = await api("/api/projects", { name: "Santiam Canyon Debris Cleanup (public photos)", description: "Clearing of wildfire debris at Upward Bound Camp, Oregon, April to July 2021. Photos: Oregon Department of Transportation, CC BY 2.0.", activity_type: "cleanup", center_lat: 44.7508, center_lng: -122.4155, radius_m: 300, start_date: "2021-04-01", end_date: "2021-07-15", asset_ids: pick("A") })
  const b = await api("/api/projects", { name: "Oneness Vann Tree Plantation (public photos)", description: "Community tree plantation with nursery and water bodies, India. Photos: Sant Nirankari Mission via Wikimedia Commons, CC BY-SA 4.0.", activity_type: "plantation", asset_ids: pick("B") })
  await api("/api/trust/recompute")
  const pairs = await api(`/api/projects/${a.project.id}/pairs`)
  console.log(`\nSeeded ${ITEMS.length} real photos, 2 projects, ${pairs.pairs} before/after pairs (photos are PENDING: run Analyze).\n  ${APP}/projects/${a.project.id}\n  ${APP}/projects/${b.project.id}\n  ${APP}/review`)
}

async function main() {
  const r = await fetch(`${APP}/api/analyze/status`).catch(() => null)
  if (!r?.ok) throw new Error(`The app is not reachable at ${APP}. Start it with "npm run dev" (or set APP_URL) and try again.`)
  await reset()
  if (!args.has("--reset-only")) await seed()
}
main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1) })
