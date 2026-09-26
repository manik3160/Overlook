// Backfill: reads words in every analysed photo that has not been read yet, with Cloudinary's OCR add-on
// ("Text Detection and Extraction"). ONE OCR operation per photo, cached; prints the count before starting.
// Then syncs the found words onto the files in Cloudinary. Run: npm run ocr   (add --yes to skip the pause)
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const { selectAll, supabase } = await import("@/lib/supabase")
  const { readTextInPhoto } = await import("@/lib/ocr")
  const { syncAssetsToCloudinary } = await import("@/lib/cloudinary-sync")
  const rows = await selectAll<{ id: string; public_id: string; secure_url: string; resource_type: string }>((from, to) =>
    supabase.from("assets").select("id, public_id, secure_url, resource_type").eq("resource_type", "image").eq("status", "done").order("id").range(from, to))
  const { data: done } = await supabase.from("analyses").select("asset_id").eq("kind", "ocr")
  const have = new Set((done ?? []).map((d) => d.asset_id as string))
  const todo = rows.filter((r) => !have.has(r.id))
  console.log(`${todo.length} photo(s) to read (${rows.length - todo.length} already read). Each costs 1 OCR operation.`)
  if (!process.argv.includes("--yes")) await new Promise((r) => setTimeout(r, 5000))
  const withText: string[] = []
  for (const r of todo) {
    const t = await readTextInPhoto(r)
    if (t?.text) withText.push(r.id)
    console.log(`${r.public_id}: ${t?.text ? JSON.stringify(t.text.replace(/\n/g, " / ")) + (t.locale ? ` (${t.locale})` : "") : t ? "no text" : "failed"}`)
  }
  if (withText.length) console.log("synced to Cloudinary:", JSON.stringify(await syncAssetsToCloudinary(withText)))
}
main().catch((e) => { console.error(e); process.exit(1) })
