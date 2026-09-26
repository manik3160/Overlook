// Step 5 test: e_improve (standard auto colour/contrast) vs e_enhance (AI) on ONE photo, with credits before/after.
// Run: npx tsx scripts/try-enhance.ts <public_id> <outDir>
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"

config({ path: ".env.local" })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
const [publicId = "evidence/real/b-canopy", outDir = "."] = process.argv.slice(2)
const base = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`

async function get(name: string, tx: string) {
  const url = `${base}/${tx}/c_limit,w_800,h_800/q_auto/${publicId}.jpg`
  const t0 = Date.now()
  for (let i = 0; i < 40; i++) {
    const res = await fetch(url)
    if (res.status === 423) { await new Promise((r) => setTimeout(r, 3000)); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    console.log(`${name}: HTTP ${res.status} ${((Date.now() - t0) / 1000).toFixed(1)} s ${buf.length} bytes ${res.ok ? "" : res.headers.get("x-cld-error")}`)
    if (res.ok) writeFileSync(join(outDir, `${name}.jpg`), buf)
    return
  }
}

async function main() {
  const u0 = await cloudinary.api.usage()
  await get("enh-none", "e_pixelate_faces")
  await get("enh-improve", "e_improve/e_pixelate_faces")
  const u1 = await cloudinary.api.usage()
  await get("enh-enhance", "e_enhance/e_pixelate_faces")
  await new Promise((r) => setTimeout(r, 4000))
  const u2 = await cloudinary.api.usage()
  console.log("transformations:", u0.transformations.usage, "->", u1.transformations.usage, "(improve) ->", u2.transformations.usage, "(enhance) | credits", u0.credits.usage, "->", u2.credits.usage)
}
main().catch((e) => { console.error("FAILED:", e?.error ?? e); process.exit(1) })
