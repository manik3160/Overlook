// One plain line per uploaded file saying what Cloudinary found, shown in the upload list. PURE (tested).
import type { FileMeta } from "./cld-exif"

export type UploadReport = { text: string; tone: "ok" | "info" | "warn" }
type Saved = { resource_type?: string; trust_flags?: { code: string }[] | null }

export function uploadReport(asset: Saved, fileMeta: FileMeta | null, sentMetadata: boolean): UploadReport {
  const codes = new Set((asset.trust_flags ?? []).map((f) => f.code))
  if (asset.resource_type === "video") return { text: "Stored by Cloudinary · key frames and transcript come with analysis", tone: "info" }
  if (codes.has("METADATA_MISMATCH")) return { text: "Cloudinary read the file: the location or time sent doesn't match it · flagged for review", tone: "warn" }
  if (codes.has("DUPLICATE_EXACT")) return { text: "Cloudinary fingerprint: this exact file was uploaded before · flagged for review", tone: "warn" }
  if (codes.has("DUPLICATE_REUSED")) return { text: "Cloudinary fingerprint: near-identical to an earlier photo · flagged for review", tone: "warn" }
  if (!fileMeta) return { text: "Stored by Cloudinary", tone: "info" }
  const gps = fileMeta.lat !== null, time = !!fileMeta.takenAt
  if (!gps && !time) return { text: "Cloudinary read the file: no location or time inside it", tone: "info" }
  const what = gps && time ? "GPS and time" : gps ? "GPS" : "time"
  return sentMetadata ? { text: `Cloudinary read the file: ${what} confirmed`, tone: "ok" } : { text: `Cloudinary read the file: ${what} found`, tone: "ok" }
}
