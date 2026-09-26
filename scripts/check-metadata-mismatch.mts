// Proves the METADATA_MISMATCH flag end to end through the app's real browser path: the signing route (which must
// accept it), a direct Cloudinary upload, then POST /api/assets. Photo A is sent with its true GPS/time (must NOT be
// flagged); photo B is sent with an edited location (must be flagged). Everything it creates is deleted at the end.
// Needs the app running. Run: npm run check-metadata   (APP_URL to target a deployed app)
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local", quiet: true })
const APP = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")
const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
cloudinary.config({ cloud_name: cloud, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TRUE = { lat: 28.6139, lng: 77.209, taken_at: "2026-09-20T04:45:30.000Z" } // what is inside both files
let fails = 0
const check = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`); if (!ok) fails++ }

async function uploadLikeTheBrowser(file: string) {
  const params = { folder: "evidence/inbox", phash: "true", timestamp: Math.round(Date.now() / 1000), upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET! }
  const sign = await fetch(`${APP}/api/sign-cloudinary-params`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paramsToSign: params }) })
  const { signature, apiKey } = await sign.json()
  check(`signing route signs a normal upload (${file})`, sign.ok && !!signature)
  const form = new FormData()
  form.append("file", new Blob([readFileSync(resolve("scripts/demo-assets", file))], { type: "image/jpeg" }), file)
  form.append("api_key", apiKey); form.append("signature", signature)
  for (const [k, v] of Object.entries(params)) form.append(k, String(v))
  const up = await (await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: form })).json()
  if (!up.public_id) throw new Error(`upload failed: ${JSON.stringify(up.error ?? up)}`)
  return up
}

const created: { id?: string; public_id: string }[] = []
try {
  const bad = await fetch(`${APP}/api/sign-cloudinary-params`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paramsToSign: { folder: "evidence/inbox", timestamp: Math.round(Date.now() / 1000), upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, public_id: "evidence/real/a-after-1", overwrite: true } }) })
  check("signing route refuses public_id + overwrite", bad.status === 400)

  for (const [file, sent, wantFlag] of [["gps-photo-a.jpg", TRUE, false], ["gps-photo-b.jpg", { ...TRUE, lat: 19.076, lng: 72.8777 }, true]] as const) {
    const up = await uploadLikeTheBrowser(file)
    created.push({ public_id: up.public_id })
    const res = await fetch(`${APP}/api/assets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      public_id: up.public_id, asset_id: up.asset_id, resource_type: "image", secure_url: up.secure_url, etag: up.etag, phash: up.phash ?? null,
      width: up.width, height: up.height, ...sent, has_exif: true }) })
    const { asset } = await res.json()
    created[created.length - 1].id = asset?.id
    const codes = ((asset?.trust_flags ?? []) as { code: string }[]).map((f) => f.code)
    check(`${file}: ${wantFlag ? "edited location IS flagged" : "honest upload is NOT flagged"}`, codes.includes("METADATA_MISMATCH") === wantFlag, `score ${asset?.trust_score}, flags ${codes.join(",") || "none"}`)
  }

  // An import that sends NO metadata (like the Drive/Dropbox/link importer) gets it from Cloudinary instead.
  const up = await uploadLikeTheBrowser("gps-photo-a.jpg")
  created.push({ public_id: up.public_id })
  const res = await fetch(`${APP}/api/assets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
    public_id: up.public_id, asset_id: up.asset_id, resource_type: "image", secure_url: up.secure_url, etag: up.etag, phash: up.phash ?? null,
    width: up.width, height: up.height, lat: null, lng: null, taken_at: null, has_exif: false }) })
  const { asset } = await res.json()
  created[created.length - 1].id = asset?.id
  check("import with no metadata: location and time filled from what Cloudinary read", Math.abs((asset?.lat ?? 0) - TRUE.lat) < 0.001 && asset?.taken_at?.startsWith("2026-09-20T04:45:30") && asset?.has_exif === true, `${asset?.lat}, ${asset?.lng}, ${asset?.taken_at}`)
} finally {
  for (const c of created) {
    if (c.id) await sb.from("assets").delete().eq("id", c.id)
    await cloudinary.uploader.destroy(c.public_id, { invalidate: true }).catch(() => null)
  }
  console.log(`cleaned up ${created.length} test upload(s)`)
}
console.log(fails ? `${fails} CHECK(S) FAILED` : "ALL CHECKS PASSED")
process.exit(fails ? 1 : 0)
