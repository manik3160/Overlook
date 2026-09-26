// Step 3 test: ONE generative-fill story card + ONE smart-crop (g_auto) image, with credits before/after.
// Waits while Cloudinary answers 423 (still generating). Saves both images to the given folder so they can be looked at.
// Run: npx tsx scripts/try-gen-fill.ts <public_id> <outDir>
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"

config({ path: ".env.local" })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })

const [publicId = "evidence/real/a-after-1", outDir = "."] = process.argv.slice(2)
const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const base = `https://res.cloudinary.com/${cloud}/image/upload`
const urls = {
  genfill: `${base}/c_pad,w_1080,h_1920,b_gen_fill/e_pixelate_faces/q_auto/${publicId}.jpg`,
  smartcrop: `${base}/e_pixelate_faces/c_fill,g_auto,w_1080,h_1920/q_auto/${publicId}.jpg`,
  plaincrop: `${base}/e_pixelate_faces/c_fill,w_1080,h_1920/q_auto/${publicId}.jpg`,
}

async function fetchReady(name: string, url: string) {
  const t0 = Date.now()
  for (let i = 0; i < 40; i++) {
    const res = await fetch(url)
    if (res.status === 423) { await new Promise((r) => setTimeout(r, 3000)); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    console.log(`${name}: HTTP ${res.status} after ${((Date.now() - t0) / 1000).toFixed(1)} s, ${buf.length} bytes${res.ok ? "" : ` error=${res.headers.get("x-cld-error")}`}`)
    if (res.ok) writeFileSync(join(outDir, `${name}.jpg`), buf)
    return
  }
  console.log(`${name}: still 423 after 120 s`)
}

async function main() {
  const before = await cloudinary.api.usage()
  console.log("credits before:", before.credits?.usage, "| transformations:", before.transformations?.usage)
  for (const [name, url] of Object.entries(urls)) await fetchReady(name, url)
  await new Promise((r) => setTimeout(r, 5000))
  const after = await cloudinary.api.usage()
  console.log("credits after:", after.credits?.usage, "| transformations:", after.transformations?.usage)
  console.log("(usage can lag; re-check later with the same call)")
}

main().catch((e) => { console.error("FAILED:", e?.error ?? e); process.exit(1) })
