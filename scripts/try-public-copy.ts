// Step 4 test: store a copy of one photo with faces pixelated ON UPLOAD (incoming transformation), then download the
// stored file with NO transformation, to prove the blur is baked into the file itself. Deletes the test copy after.
// Run: npx tsx scripts/try-public-copy.ts <public_id> <outDir>
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"

config({ path: ".env.local" })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })

const [publicId = "evidence/real/b-planting", outDir = "."] = process.argv.slice(2)

async function main() {
  const before = await cloudinary.api.usage()
  const src = await cloudinary.api.resource(publicId)
  const res = await cloudinary.uploader.upload(src.secure_url, {
    public_id: "overlook/public/try-copy",
    overwrite: true,
    transformation: [{ effect: "pixelate_faces" }, { crop: "limit", width: 2000, height: 2000 }],
  })
  console.log("stored:", res.public_id, res.width, "x", res.height, res.bytes, "bytes")
  const raw = res.secure_url // no transformation in this URL
  const buf = Buffer.from(await (await fetch(raw)).arrayBuffer())
  writeFileSync(join(outDir, "public-copy-raw.jpg"), buf)
  const orig = Buffer.from(await (await fetch(src.secure_url.replace("/upload/", "/upload/c_limit,w_2000,h_2000/"))).arrayBuffer())
  writeFileSync(join(outDir, "original.jpg"), orig)
  console.log("raw URL of the stored copy:", raw)
  await cloudinary.uploader.destroy("overlook/public/try-copy", { invalidate: true })
  const after = await cloudinary.api.usage()
  console.log("credits:", before.credits.usage, "->", after.credits.usage, "| transformations:", before.transformations.usage, "->", after.transformations.usage)
}

main().catch((e) => { console.error("FAILED:", e?.error ?? e); process.exit(1) })
