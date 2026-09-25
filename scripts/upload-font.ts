// One-time setup for Hindi campaign cards: uploads Noto Sans Devanagari Bold to Cloudinary as an
// authenticated raw file so it can be used in text overlays (l_text:NotoSansDevanagari-Bold.ttf_...).
// Run: npm run upload-font   (the font is open-licensed, SIL OFL)
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"

config({ path: ".env.local" })
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const FONT_URL = "https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSansDevanagari/hinted/ttf/NotoSansDevanagari-Bold.ttf"

async function main() {
  const res = await fetch(FONT_URL, { redirect: "follow" })
  if (!res.ok) throw new Error(`Could not download the font (${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const uploaded = await new Promise<{ public_id: string; type: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: "raw", type: "authenticated", public_id: "NotoSansDevanagari-Bold.ttf", overwrite: true }, (err, r) => (err || !r ? reject(err ?? new Error("upload failed")) : resolve(r)))
      .end(buffer)
  })
  console.log(`Uploaded ${uploaded.public_id} (${uploaded.type}, ${buffer.length} bytes)`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
