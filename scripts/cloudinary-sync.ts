// Backfill: writes trust band/score, review, project, flags, AI tags and caption onto every asset in Cloudinary and
// moves each file into its project's Media Library folder (URLs unchanged). Safe to re-run. Upload API only, no AI units.
// Run: npm run cloudinary:sync            (all assets)
//      npm run cloudinary:sync -- <id>... (only these asset ids)
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const { supabase, selectAll } = await import("@/lib/supabase")
  const { syncAssetsToCloudinary } = await import("@/lib/cloudinary-sync")
  const only = process.argv.slice(2)
  const ids = only.length
    ? only
    : (await selectAll<{ id: string }>((from, to) => supabase.from("assets").select("id").order("id").range(from, to))).map((r) => r.id)
  console.log(`syncing ${ids.length} assets to Cloudinary...`)
  const res = await syncAssetsToCloudinary(ids)
  console.log(`done: ${res.synced} synced, ${res.failed} failed`)
  if (res.failed) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
