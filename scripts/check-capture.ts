// End-to-end check of signed live capture against a running app (acts as a phone): a good capture, then
// replay, swapped photo, forged session, wrong key, edited location, back-dated photo, bad GPS, far-away
// capture, ghost pairing and a plain upload. Creates a throwaway project and deletes everything it made.
// Needs ffmpeg. Run: npm run check-capture   (APP_URL=https://... to target a deployment)
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { v2 as cloudinary } from "cloudinary"
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { exportPublicKey, generateDeviceKey, sha256Hex, signPayload, type CapturePayload } from "../lib/capture"
import type { UploadApiResponse } from "cloudinary"

type Flag = { code: string }
type Asset = { id: string; trust_score: number | null; trust_flags: Flag[] | null; taken_at: string; lat: number; project_id: string; capture_proof: { verified?: boolean; deviceId?: string } | null }
type ApiBody = { error?: string; nonce?: string; asset?: Asset } & Record<string, unknown>

config({ path: ".env.local" })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const BASE = process.env.APP_URL ?? "http://localhost:3000"
const SITE = { lat: 44.7508, lng: -122.4155 }
const uploaded: string[] = []
let n = 0

const post = async (path: string, body?: unknown) => {
  const r = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, body: (await r.json().catch(() => ({}))) as ApiBody }
}
const nonce = async () => (await post("/api/capture/nonce")).body.nonce!

// a unique JPEG each time (so it is never an exact duplicate of anything)
async function photo(): Promise<{ bytes: Buffer; up: UploadApiResponse }> {
  const file = `/tmp/captest-${Date.now()}-${n++}.jpg`
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=0x${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}:s=640x480`, "-vf", `noise=alls=90:all_seed=${Math.floor(Math.random() * 1e6)}`, "-frames:v", "1", file])
  const bytes = readFileSync(file)
  const up = await cloudinary.uploader.upload(file, { folder: "evidence/captest", phash: true })
  uploaded.push(up.public_id)
  return { bytes, up }
}
const uploadInfo = (up: UploadApiResponse) => ({ public_id: up.public_id, asset_id: up.asset_id, secure_url: up.secure_url, etag: up.etag, phash: up.phash ?? null, width: up.width, height: up.height })

async function main() {
  const { data: project, error: pe } = await sb.from("projects").insert({ name: "ZZ capture test (auto-deleted)", activity_type: "cleanup", center_lat: SITE.lat, center_lng: SITE.lng, radius_m: 500, start_date: "2026-09-01", end_date: "2026-12-31" }).select().single()
  if (pe) throw new Error(pe.message)
  const results: [string, boolean, string][] = []
  const check = (name: string, ok: boolean, detail: string) => { results.push([name, ok, detail]); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`) }
  try {
    const pair = await generateDeviceKey(); const pub = await exportPublicKey(pair)
    const mk = (nonceStr: string, sha256: string, o: Partial<CapturePayload> = {}): CapturePayload => ({ v: 1, sha256, lat: SITE.lat + 0.0002, lng: SITE.lng, accuracyM: 9, capturedAt: new Date().toISOString(), nonce: nonceStr, projectId: project.id, ghostAssetId: null, ...o })
    const send = async (payload: CapturePayload, up: UploadApiResponse, key = pair, publicKey = pub, sigOf = payload) => post("/api/capture", { payload, signature: await signPayload(key.privateKey, sigOf), publicKey, upload: uploadInfo(up) })

    // A. a good capture
    const a = await photo(); const pa = mk(await nonce(), await sha256Hex(a.bytes))
    const ra = await send(pa, a.up)
    const assetA = ra.body.asset
    check("A good capture is accepted", ra.status === 200 && !!assetA, `status ${ra.status} ${ra.body.error ?? ""}`)
    const codes = (assetA?.trust_flags ?? []).map((f) => f.code)
    check("A gets CAPTURED_LIVE, score 100, no NO_METADATA", codes.includes("CAPTURED_LIVE") && !codes.includes("NO_METADATA") && assetA?.trust_score === 100, `flags ${codes.join(",")} score ${assetA?.trust_score}`)
    check("A stored the signed time/place and project", Date.parse(assetA?.taken_at ?? "") === Date.parse(pa.capturedAt) && assetA?.lat === pa.lat && assetA?.project_id === project.id, `taken_at ${assetA?.taken_at}`)
    check("A stored a device id + verified proof", assetA?.capture_proof?.verified === true && /^[0-9a-f]{12}$/.test(assetA?.capture_proof?.deviceId ?? ""), `device ${assetA?.capture_proof?.deviceId}`)

    // B. replay the identical request
    const rb = await post("/api/capture", { payload: pa, signature: await signPayload(pair.privateKey, pa), publicKey: pub, upload: uploadInfo(a.up) })
    check("B replayed request is refused", rb.status === 409, `status ${rb.status} ${rb.body.error}`)

    // C. signed hash is not the stored file
    const c = await photo(); const rc = await send(mk(await nonce(), "f".repeat(64)), c.up)
    check("C photo swapped after signing is refused", rc.status === 400 && /not the photo that was signed/.test(rc.body.error ?? ""), `status ${rc.status} ${rc.body.error}`)

    // D. forged nonce
    const d = await photo(); const good = await nonce(); const forged = good.slice(0, -3) + "AAA"
    const rd = await send(mk(forged, await sha256Hex(d.bytes)), d.up)
    check("D forged session code is refused", rd.status === 400 && /Unknown capture session/.test(rd.body.error ?? ""), `status ${rd.status} ${rd.body.error}`)

    // E. signed by a different device than the key sent
    const e = await photo(); const other = await generateDeviceKey(); const pe2 = mk(await nonce(), await sha256Hex(e.bytes))
    const re = await send(pe2, e.up, other, pub)
    check("E signature from another key is refused", re.status === 400 && /signature/.test(re.body.error ?? ""), `status ${re.status} ${re.body.error}`)

    // F. location edited after signing
    const f = await photo(); const pf = mk(await nonce(), await sha256Hex(f.bytes)); const sigF = pf
    const rf = await send({ ...pf, lat: 10.5 }, f.up, pair, pub, sigF)
    check("F location edited after signing is refused", rf.status === 400 && /signature/.test(rf.body.error ?? ""), `status ${rf.status} ${rf.body.error}`)

    // G. photo claims to be older than its session
    const g = await photo(); const rg = await send(mk(await nonce(), await sha256Hex(g.bytes), { capturedAt: new Date(Date.now() - 2 * 3600_000).toISOString() }), g.up)
    check("G back-dated photo is refused", rg.status === 400 && /older than its capture session/.test(rg.body.error ?? ""), `status ${rg.status} ${rg.body.error}`)

    // H. unusable location
    const h = await photo(); const rh = await send(mk(await nonce(), await sha256Hex(h.bytes), { lat: 0, lng: 0 }), h.up)
    check("H null-island location is refused", rh.status === 400 && /location/.test(rh.body.error ?? ""), `status ${rh.status} ${rh.body.error}`)

    // I. a real capture far from the site loses points but keeps the badge (place is still checked)
    const i = await photo(); const ri = await send(mk(await nonce(), await sha256Hex(i.bytes), { lat: 28.6, lng: 77.2 }), i.up)
    const ci = (ri.body.asset?.trust_flags ?? []).map((x) => x.code)
    check("I far-away capture: OUTSIDE_GEOFENCE still flagged, score 75", ri.status === 200 && ci.includes("OUTSIDE_GEOFENCE") && ci.includes("CAPTURED_LIVE") && ri.body.asset?.trust_score === 75, `flags ${ci.join(",")} score ${ri.body.asset?.trust_score}`)

    // J. ghost retake pairs with its ghost
    const j = await photo(); const pj = mk(await nonce(), await sha256Hex(j.bytes), { ghostAssetId: assetA!.id, lat: SITE.lat + 0.0003 })
    const rj = await send(pj, j.up)
    check("J ghost retake is accepted", rj.status === 200, `status ${rj.status} ${rj.body.error ?? ""}`)
    const pr = await post(`/api/projects/${project.id}/pairs`)
    const { data: pairs } = await sb.from("pairs").select("before_asset_id, after_asset_id, distance_m, days_apart").eq("project_id", project.id)
    const ok = pairs?.length === 1 && pairs[0].before_asset_id === assetA!.id && pairs[0].after_asset_id === rj.body.asset?.id
    check("J ghost retake pairs with the photo it was lined up with", ok, `pairs ${JSON.stringify(pairs)} route ${JSON.stringify(pr.body)}`)

    // K. a normal upload (no signature) gets no badge
    const k = await photo(); const rk = await post("/api/assets", { ...uploadInfo(k.up), resource_type: "image", has_exif: false })
    const ck = (rk.body.asset?.trust_flags ?? []).map((x) => x.code)
    check("K plain upload: NO_METADATA, capped 60, no CAPTURED_LIVE", rk.status === 200 && ck.includes("NO_METADATA") && !ck.includes("CAPTURED_LIVE") && rk.body.asset?.trust_score === 60, `flags ${ck.join(",")} score ${rk.body.asset?.trust_score}`)

    // how many assets exist with the replayed nonce (must be exactly 1)
    const { data: dup } = await sb.from("assets").select("id").eq("capture_proof->payload->>nonce", pa.nonce)
    check("B only ONE asset exists for the replayed session", dup?.length === 1, `rows ${dup?.length}`)
    writeFileSync("/tmp/captest-project.txt", project.id)
  } finally {
    // cleanup: pairs, assets, project, Cloudinary files
    await sb.from("pairs").delete().eq("project_id", project.id)
    const { data: mine } = await sb.from("assets").select("id, public_id").eq("project_id", project.id)
    const { data: plain } = await sb.from("assets").select("id, public_id").in("public_id", uploaded)
    const ids = [...new Set([...(mine ?? []), ...(plain ?? [])].map((r) => r.id))]
    if (ids.length) await sb.from("assets").delete().in("id", ids)
    await sb.from("projects").delete().eq("id", project.id)
    if (uploaded.length) await cloudinary.api.delete_resources(uploaded)
    const { count } = await sb.from("assets").select("id", { count: "exact", head: true })
    console.log(`cleanup done: removed ${ids.length} assets, ${uploaded.length} Cloudinary files; assets now ${count}`)
  }
  const failed = results.filter((r) => !r[1])
  console.log(failed.length ? `\n${failed.length} FAILED` : `\nALL ${results.length} CHECKS PASSED`)
  process.exit(failed.length ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
