// One-time setup for highlight reels: uploads the 3 s black 1080x1080 base clip (scripts/demo-assets/reel-base.mp4).
// Cloudinary can only splice images onto a VIDEO, so every reel starts from this clip.
// Run: npm run upload-reel-base
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"
import { REEL_BASE } from "../lib/reel"

config({ path: ".env.local" })
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function main() {
  const r = await cloudinary.uploader.upload("scripts/demo-assets/reel-base.mp4", { resource_type: "video", public_id: REEL_BASE, overwrite: true })
  console.log(`Uploaded ${r.public_id} (${r.duration} s, ${r.width}x${r.height})`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
