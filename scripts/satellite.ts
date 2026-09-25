// Stretch S1: precompute the satellite cross-check for ONE project (needs center, radius and end date).
// Finds the clearest Sentinel-2 scene over the site in the same season before and after the project,
// measures NDVI + land cover there, stores true-colour crops in Cloudinary, and saves a hashed
// 'satellite' report. Public data (Microsoft Planetary Computer), no account, no AI calls.
// Run: npm run satellite -- <projectId>
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { v2 as cloudinary } from "cloudinary"
import { randomUUID } from "node:crypto"
import { manifestHash } from "../lib/manifest"
import { formatDay } from "../lib/dates"
import { comparisonWindows, MAX_CLOUD_SHARE, SATELLITE_SOURCE, satelliteVerdict, sceneShares, siteBox, type SceneSummary, type Window } from "../lib/satellite"

config({ path: ".env.local" })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const PC = "https://planetarycomputer.microsoft.com/api"
const COLLECTION = "sentinel-2-l2a"
const NDVI = "(B08-B04)/(B08+B04)"
const CANDIDATES = 8 // least-cloudy scenes (tile-wide) to try per window
const CROP_PX = 512

type Stats = { mean: number; count: number; histogram: [number[], number[]] }
type Feature = { type: "Feature"; properties: Record<string, never>; geometry: { type: "Polygon"; coordinates: number[][][] } }

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${res.status} from ${url.split("?")[0]}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()) as T
}

async function stats(item: string, site: Feature, params: Record<string, string>): Promise<Stats> {
  const q = new URLSearchParams({ collection: COLLECTION, item, ...params })
  const body = await postJson<{ properties: { statistics: Record<string, Stats> } }>(`${PC}/data/v1/item/statistics?${q}`, site)
  return Object.values(body.properties.statistics)[0]
}

async function clearestScene(window: Window, site: Feature): Promise<SceneSummary | null> {
  const search = await postJson<{ features: { id: string; properties: { datetime: string; "eo:cloud_cover": number } }[] }>(`${PC}/stac/v1/search`, {
    collections: [COLLECTION], intersects: site.geometry, datetime: `${window.from}T00:00:00Z/${window.to}T23:59:59Z`, limit: 100,
  })
  const ordered = search.features.sort((a, b) => a.properties["eo:cloud_cover"] - b.properties["eo:cloud_cover"]).slice(0, CANDIDATES)
  for (const f of ordered) {
    // tile-wide cloud cover says little about our few hundred metres, so check the site itself
    const shares = sceneShares((await stats(f.id, site, { assets: "SCL", categorical: "true" })).histogram)
    if (shares.cloud >= MAX_CLOUD_SHARE) continue
    const ndvi = await stats(f.id, site, { expression: NDVI, asset_as_band: "true" })
    return { id: f.id, date: f.properties.datetime.slice(0, 10), ndvi: Math.round(ndvi.mean * 1000) / 1000, vegetationShare: shares.vegetation, bareShare: shares.bare, cloudShare: shares.cloud, pixels: ndvi.count }
  }
  return null
}

async function storeCrop(projectId: string, label: "before" | "after", scene: SceneSummary, box: number[]) {
  const q = new URLSearchParams({ collection: COLLECTION, item: scene.id, assets: "visual", asset_bidx: "visual|1,2,3", nodata: "0" })
  const sourceUrl = `${PC}/data/v1/item/bbox/${box.join(",")}/${CROP_PX}x${CROP_PX}.png?${q}`
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`crop ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const png = Buffer.from(await res.arrayBuffer())
  const up = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ public_id: `overlook/satellite/${projectId}/${label}`, overwrite: true }, (err, r) => (err || !r ? reject(err ?? new Error("upload failed")) : resolve(r)))
      .end(png)
  })
  return { source_url: sourceUrl, public_id: up.public_id, secure_url: up.secure_url }
}

async function main() {
  const projectId = process.argv[2]
  if (!projectId) throw new Error("Usage: npm run satellite -- <projectId>")
  const { data: p } = await sb.from("projects").select("id, name, activity_type, center_lat, center_lng, radius_m, end_date").eq("id", projectId).maybeSingle()
  if (!p) throw new Error("Project not found")
  if (p.center_lat === null || p.center_lng === null || !p.end_date) throw new Error("The project needs a center (map) and an end date")

  const radius = p.radius_m ?? 500
  const box = siteBox(p.center_lat, p.center_lng, radius)
  const [x0, y0, x1, y1] = box
  const site: Feature = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] } }
  const windows = comparisonWindows(p.end_date)

  const [before, after] = await Promise.all([clearestScene(windows.before, site), clearestScene(windows.after, site)])
  for (const [label, scene, w] of [["before", before, windows.before], ["after", after, windows.after]] as const) {
    console.log(scene ? `${label}: ${scene.date} NDVI ${scene.ndvi} veg ${Math.round(scene.vegetationShare * 100)}% bare ${Math.round(scene.bareShare * 100)}% (${scene.pixels} px)` : `${label}: no clear scene ${w.from}..${w.to}`)
  }
  if (!before || !after) throw new Error("No cloud-free scene over the site in one of the windows; nothing saved")

  const [beforeCrop, afterCrop] = await Promise.all([storeCrop(p.id, "before", before, box), storeCrop(p.id, "after", after, box)])
  const verdict = satelliteVerdict(p.activity_type, before, after, formatDay)
  const stac = (id: string) => `${PC}/stac/v1/collections/${COLLECTION}/items/${id}`
  const reportId = randomUUID()
  const manifest = {
    schema: "overlook-satellite/1",
    satellite: { id: reportId, generated_at: new Date().toISOString(), source: SATELLITE_SOURCE },
    project: { id: p.id, name: p.name, activity_type: p.activity_type, center_lat: p.center_lat, center_lng: p.center_lng, radius_m: radius },
    site_box: box,
    windows,
    before: { ...before, stac_url: stac(before.id), crop: beforeCrop },
    after: { ...after, stac_url: stac(after.id), crop: afterCrop },
    verdict,
  }
  const { data: previous } = await sb.from("reports").select("id").eq("project_id", p.id).eq("kind", "satellite")
  const { error } = await sb.from("reports").insert({ id: reportId, project_id: p.id, kind: "satellite", manifest, manifest_sha256: manifestHash(manifest) })
  if (error) throw new Error(error.message)
  if (previous?.length) await sb.from("reports").delete().in("id", previous.map((r) => r.id))
  console.log(`${verdict.tone}: ${verdict.text}`)
  console.log(`Saved satellite report ${reportId}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
