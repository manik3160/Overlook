import "server-only"
import { cloudinary } from "@/lib/cloudinary"
import { cachedCall } from "@/lib/cache"
import { parseCloudinaryMetadata, type FileMeta } from "@/lib/cld-exif"

// Asks Cloudinary what the stored file itself says (GPS, capture time, camera). Admin API, no AI units, cached per
// file version in `analyses` (kind cloudinary_exif). Null when Cloudinary cannot be reached (the upload still works).
export async function readFileMeta(asset: { id: string; public_id: string; etag?: string | null }): Promise<FileMeta | null> {
  try {
    const { result } = await cachedCall<FileMeta>("cloudinary_exif", asset.id, { etag: asset.etag ?? asset.public_id, v: 1 }, async () => {
      const r = await cloudinary.api.resource(asset.public_id, { resource_type: "image", image_metadata: true })
      return parseCloudinaryMetadata(r.image_metadata as Record<string, unknown> | undefined)
    })
    return result
  } catch (e) {
    console.error(`[file-meta] ${asset.public_id}:`, (e as { error?: unknown })?.error ?? e)
    return null
  }
}
