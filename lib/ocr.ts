import "server-only"
import { cloudinary } from "@/lib/cloudinary"
import { cachedCall } from "@/lib/cache"
import { supabase } from "@/lib/supabase"
import { parseOcr, type PhotoText } from "@/lib/ocr-parse"

// Reads words in a photo (signboards, banners, plot numbers) with Cloudinary's OCR add-on. Cloudinary returns no OCR
// result for `explicit` on an existing file, so a size-limited temporary copy is uploaded with `ocr`, read, and deleted.
// One OCR operation per photo, cached in `analyses` (kind `ocr`). Never throws: a failure just means no text shown.
export async function readTextInPhoto(asset: { id: string; secure_url: string; resource_type: string }): Promise<PhotoText | null> {
  if (asset.resource_type !== "image") return null
  const tmp = `registry-checks/ocr-${asset.id}`
  try {
    const { result } = await cachedCall<PhotoText>("ocr", asset.id, { v: 1 }, async () => {
      try {
        const src = asset.secure_url.replace("/upload/", "/upload/c_limit,w_2000,h_2000,q_auto,f_jpg/")
        const r = await cloudinary.uploader.upload(src, { public_id: tmp, overwrite: true, ocr: "adv_ocr" })
        return parseOcr(r.info)
      } finally {
        await cloudinary.uploader.destroy(tmp, { invalidate: true }).catch(() => null)
      }
    })
    return result
  } catch (e) {
    console.error(`[ocr] ${asset.id}:`, (e as { error?: { message?: string } })?.error?.message ?? e)
    return null
  }
}

export async function loadPhotoText(assetId: string): Promise<PhotoText | null> {
  const { data } = await supabase.from("analyses").select("result").eq("asset_id", assetId).eq("kind", "ocr").limit(1).maybeSingle()
  return (data?.result as PhotoText | undefined) ?? null
}

// Asset ids whose photo text contains `q` (for search, like transcript matches).
export async function assetsWithText(q: string, limit = 20): Promise<string[]> {
  const like = q.replace(/[\\%_]/g, (c) => `\\${c}`)
  const { data } = await supabase.from("analyses").select("asset_id").eq("kind", "ocr").ilike("result->>text", `%${like}%`).limit(limit)
  return (data ?? []).map((r) => r.asset_id as string)
}
