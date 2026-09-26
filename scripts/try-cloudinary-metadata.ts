// Proves structured metadata works on this account before building on it (Step 1 of the Cloudinary plan).
// Creates a throwaway field, sets it on ONE existing photo, reads it back, reports the folder mode, then removes
// the field again. Uses the Upload API (`explicit`) for the write. No AI units.
// Run: npx tsx scripts/try-cloudinary-metadata.ts
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FIELD = "overlook_try"

async function main() {
  const usageBefore = await cloudinary.api.usage()
  console.log("credits used before:", usageBefore.credits?.usage, "/", usageBefore.credits?.limit)

  const fields = await cloudinary.api.list_metadata_fields()
  console.log("existing fields:", fields.metadata_fields.map((f: { external_id: string }) => f.external_id))
  if (!fields.metadata_fields.some((f: { external_id: string }) => f.external_id === FIELD)) {
    await cloudinary.api.add_metadata_field({ external_id: FIELD, label: "Overlook try", type: "string" })
    console.log("created field", FIELD)
  }

  const { data: row, error } = await supabase.from("assets").select("public_id, resource_type").eq("resource_type", "image").limit(1).maybeSingle()
  if (error || !row) throw new Error(`no image asset in DB: ${error?.message}`)
  console.log("asset:", row.public_id)

  const res = await cloudinary.uploader.explicit(row.public_id, { type: "upload", resource_type: "image", metadata: `${FIELD}=hello from overlook` })
  console.log("explicit ok, metadata in response:", res.metadata)

  const read = await cloudinary.api.resource(row.public_id)
  console.log("read back metadata:", read.metadata)
  console.log("asset_folder:", read.asset_folder ?? "(absent -> FIXED folder mode)", "| display_name:", read.display_name ?? "(absent)")
  console.log("tags:", read.tags, "| context:", read.context)

  await cloudinary.api.delete_metadata_field(FIELD)
  console.log("removed field", FIELD)
  const usageAfter = await cloudinary.api.usage()
  console.log("credits used after:", usageAfter.credits?.usage)
}

main().catch((e) => {
  console.error("FAILED:", e?.error ?? e)
  process.exit(1)
})
