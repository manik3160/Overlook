// Backfill: asks Cloudinary AI Vision for a second opinion on every photo already flagged PHOTO_OF_PHOTO that does not
// have one yet (about 320 AI Vision units each; cached, so re-running costs nothing).
// Run: npm run second-opinion
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const { supabase } = await import("@/lib/supabase")
  const { screenSecondOpinion } = await import("@/lib/second-opinion")
  const { data, error } = await supabase.from("assets").select("id, public_id, secure_url, trust_flags").eq("resource_type", "image")
  if (error) throw new Error(error.message)
  const flagged = (data ?? []).filter((a) => ((a.trust_flags ?? []) as { code: string }[]).some((f) => f.code === "PHOTO_OF_PHOTO"))
  console.log(`${flagged.length} photo(s) flagged as a screen/print`)
  for (const a of flagged) console.log(a.public_id, "->", JSON.stringify(await screenSecondOpinion(a)))
}
main().catch((e) => { console.error(e); process.exit(1) })
