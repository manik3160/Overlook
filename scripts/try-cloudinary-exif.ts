// Round 2 step 4 test: what Cloudinary reads from a stored photo's own metadata (Admin API, image_metadata: true).
// Prints the GPS/date fields exactly as Cloudinary returns them, next to what the app stored from the browser.
// Run: npx tsx scripts/try-cloudinary-exif.ts <public_id>
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  for (const id of process.argv.slice(2)) {
    const r = await cloudinary.api.resource(id, { image_metadata: true })
    const m = (r.image_metadata ?? {}) as Record<string, string>
    const keys = Object.keys(m).filter((k) => /GPS|Date|Offset|Time/i.test(k))
    console.log(`\n${id}: ${Object.keys(m).length} metadata keys`)
    for (const k of keys) console.log(`  ${k} = ${JSON.stringify(m[k])}`)
    const { data } = await sb.from("assets").select("lat, lng, taken_at, has_exif").eq("public_id", id).maybeSingle()
    console.log("  app stored:", JSON.stringify(data))
  }
}
main().catch((e) => { console.error("FAILED:", e?.error ?? e); process.exit(1) })
