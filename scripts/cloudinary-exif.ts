// Backfill: asks Cloudinary what every stored photo's own metadata says (GPS, time, camera), caches it, and prints
// which uploads disagree with what was sent. Admin API only (1 call per photo, cached), no AI units.
// Then run a trust recompute (POST /api/trust/recompute) so the METADATA_MISMATCH flag appears where it applies.
// Run: npm run cloudinary-exif
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const { selectAll, supabase } = await import("@/lib/supabase")
  const { readFileMeta } = await import("@/lib/file-meta")
  const { metadataMismatch } = await import("@/lib/cld-exif")
  const rows = await selectAll<{ id: string; public_id: string; etag: string | null; lat: number | null; lng: number | null; taken_at: string | null; capture_proof: unknown }>((from, to) =>
    supabase.from("assets").select("id, public_id, etag, lat, lng, taken_at, capture_proof").eq("resource_type", "image").order("id").range(from, to))
  let withData = 0
  for (const r of rows) {
    const m = await readFileMeta(r)
    if (m && (m.lat !== null || m.takenAt)) withData++
    const mm = m && !r.capture_proof ? metadataMismatch(r, m) : null
    console.log(`${r.public_id}: ${m ? (m.lat !== null ? "GPS" : "no GPS") + ", " + (m.takenAt ? "time" : "no time") : "unreachable"}${mm ? "  MISMATCH: " + mm.reasons.join("; ") : ""}`)
  }
  console.log(`\n${rows.length} photos read, ${withData} carry GPS or time in the file itself.`)
}
main().catch((e) => { console.error(e); process.exit(1) })
