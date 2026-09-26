import "server-only"
import { supabase } from "@/lib/supabase"
import { recomputeTrust } from "@/lib/trust-db"
import { cachedCall } from "@/lib/cache"
import { scanProvenance, SCAN_BYTES } from "@/lib/provenance"
import { readFileMeta } from "@/lib/file-meta"
import type { FileMeta } from "@/lib/cld-exif"
import { cloudinary } from "@/lib/cloudinary"

export type NewAsset = {
  public_id: string; asset_id?: string; resource_type: "image" | "video"; secure_url: string
  etag?: string; phash?: string | null; width?: number; height?: number
  taken_at?: string | null; lat?: number | null; lng?: number | null; has_exif: boolean
  project_id?: string | null; capture_proof?: unknown
}

// Inserts (or re-saves) an uploaded file as a pending asset and computes its first trust score.
// Shared by /api/assets (plain uploads) and /api/capture (signed live captures).
export async function saveAsset(b: NewAsset): Promise<{ asset: Record<string, unknown>; fileMeta: FileMeta | null } | { error: string }> {
  const { data, error } = await supabase
    .from("assets")
    .upsert(
      {
        public_id: b.public_id, asset_id: b.asset_id ?? null, resource_type: b.resource_type, secure_url: b.secure_url,
        etag: b.etag ?? null, phash: b.phash ?? null, width: b.width ?? null, height: b.height ?? null,
        taken_at: b.taken_at ?? null, lat: b.lat ?? null, lng: b.lng ?? null, has_exif: b.has_exif, status: "pending",
        ...(b.project_id ? { project_id: b.project_id } : {}),
        ...(b.capture_proof ? { capture_proof: b.capture_proof } : {}),
      },
      { onConflict: "public_id" },
    )
    .select()
    .single()
  if (error) return { error: error.message }
  // Imports through the Cloudinary Upload Widget arrive without a perceptual hash; ask Cloudinary for it so duplicate
  // checks work the same as for direct uploads.
  if (b.resource_type === "image" && !b.phash) {
    const r = await cloudinary.api.resource(b.public_id, { resource_type: "image", phash: true }).catch(() => null)
    if (r?.phash) {
      await supabase.from("assets").update({ phash: r.phash }).eq("id", data.id)
      data.phash = r.phash
    }
  }
  // Declared-AI check on the original file (free, no AI call). Our own camera's captures are skipped.
  if (b.resource_type === "image" && !b.capture_proof) await checkProvenance(data.id, b.secure_url, b.etag ?? b.public_id).catch(() => null)
  // Cloudinary reads the stored file's own metadata. The trust score compares it with what was sent; and when nothing
  // was sent (imports from Drive/Dropbox/a link, where the browser never sees the file) it becomes the photo's metadata.
  let meta: FileMeta | null = null
  if (b.resource_type === "image" && !b.capture_proof) {
    meta = await readFileMeta({ id: data.id, public_id: b.public_id, etag: b.etag })
    const sentNothing = b.lat == null && b.lng == null && !b.taken_at
    if (meta && sentNothing && (meta.lat !== null || meta.takenAt)) {
      await supabase.from("assets").update({ lat: meta.lat, lng: meta.lng, taken_at: meta.takenAt, has_exif: true }).eq("id", data.id)
    }
  }
  await recomputeTrust([data.id])
  // Re-read so the caller sees the trust score and flags that were just computed.
  const { data: scored } = await supabase.from("assets").select("*").eq("id", data.id).single()
  return { asset: scored ?? data, fileMeta: meta }
}

// Reads the start of the stored original (where metadata lives) and records what it declares. Cached per file.
async function checkProvenance(assetId: string, url: string, etag: string) {
  await cachedCall("provenance", assetId, { etag, v: 1 }, async () => {
    const res = await fetch(url, { headers: { Range: `bytes=0-${SCAN_BYTES - 1}` }, signal: AbortSignal.timeout(8000) })
    if (!res.ok && res.status !== 206) throw new Error(`could not read the original (${res.status})`)
    return scanProvenance(new Uint8Array(await res.arrayBuffer()))
  })
}
