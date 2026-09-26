import "server-only"
import { after } from "next/server"
import { cloudinary } from "@/lib/cloudinary"
import { cachedCall } from "@/lib/cache"
import { supabase } from "@/lib/supabase"
import { publicCopyId } from "@/lib/cloudinary-url"

type Source = { id: string; secure_url: string; resource_type: string }

// Stores the public copy once: Cloudinary pixelates faces on the way in, so the stored file itself is blurred.
// Recorded in `analyses` (kind public_copy), so it is never uploaded twice. The original is never touched.
export async function ensurePublicCopy(asset: Source): Promise<boolean> {
  if (asset.resource_type !== "image") return false
  try {
    await cachedCall("public_copy", asset.id, { v: 1 }, async () => {
      const res = await cloudinary.uploader.upload(asset.secure_url, {
        public_id: publicCopyId(asset.id),
        overwrite: true,
        transformation: [{ effect: "pixelate_faces" }, { crop: "limit", width: 2000, height: 2000 }],
        asset_folder: "Overlook/Public copies (faces hidden)",
        tags: ["overlook", "overlook-public-copy"],
        context: { source_asset: asset.id },
      })
      return { public_id: res.public_id, width: res.width, height: res.height }
    })
    return true
  } catch (e) {
    console.error(`[public-copy] ${asset.id}:`, (e as { error?: unknown })?.error ?? e)
    return false
  }
}

// Which of these assets already have a public copy (one query, no Cloudinary call).
export async function publicCopiesFor(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  const { data } = await supabase.from("analyses").select("asset_id").eq("kind", "public_copy").in("asset_id", ids)
  return new Set((data ?? []).map((r) => r.asset_id as string))
}

// Makes any missing copies after the response is sent (the page falls back to on-the-fly pixelation meanwhile).
export function ensurePublicCopiesLater(assets: Source[]): void {
  if (!assets.length) return
  after(async () => {
    for (const a of assets) await ensurePublicCopy(a)
  })
}
