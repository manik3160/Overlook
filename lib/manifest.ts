// Report manifest hashing. PURE. The hash is over a canonical JSON (keys sorted at every level, no
// whitespace) so it does not depend on key order, and a Postgres jsonb round trip (which reorders
// keys) cannot change it. Anyone can recompute it: JSON.stringify with sorted keys, then SHA-256.
import { createHash } from "node:crypto"
import type { Annex } from "./compliance"

export function canonicalJson(value: unknown): string {
  if (value === null) return "null"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Cannot hash a non-finite number")
    return JSON.stringify(value)
  }
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : canonicalJson(v))).join(",")}]`
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`
  }
  throw new Error(`Cannot hash a value of type ${typeof value}`)
}

export const sha256Hex = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex")

export const manifestHash = (manifest: unknown): string => sha256Hex(canonicalJson(manifest))

// Report images: faces are pixelated (public/donor-facing content); .jpg because the PDF library needs JPG/PNG.
const asJpg = (url: string) => url.replace(/\.[a-z0-9]+$/i, ".jpg")
export const reportThumbUrl = (secureUrl: string) => asJpg(secureUrl.replace("/upload/", "/upload/e_pixelate_faces/c_fill,w_400,h_300,f_jpg,q_auto/"))
export const reportSlideUrl = (secureUrl: string) => asJpg(secureUrl.replace("/upload/", "/upload/e_pixelate_faces/c_fill,w_800,h_600,f_jpg,q_auto/"))

export type ManifestAsset = {
  public_id: string; resource_type: string; original_url: string; report_url: string
  trust_score: number | null; review_status: string; taken_at: string | null; lat: number | null; lng: number | null
  etag: string | null; phash: string | null; flags: { code: string; severity: string; reason: string }[]
  // Cloudinary checks, only on newer reports (absent keys are left out of the hash, so older reports are unchanged)
  file_check?: { gps: boolean; time: boolean; mismatch: boolean } // what Cloudinary read inside the stored file
  photo_text?: { text: string; scripts: string[] } // words Cloudinary's OCR read in the photo
}
export type ManifestPair = { before_public_id: string; after_public_id: string; before_report_url: string; after_report_url: string; days_apart: number | null; distance_m: number | null; change_summary: string | null }
export type ScorecardRow = { key: string; label: string; before: { hits: number; total: number } | null; after: { hits: number; total: number } | null; all: { hits: number; total: number } }
export type ReportManifest = {
  schema: string
  report: { id: string; kind: string; title: string; generated_at: string; rejected_excluded: number }
  project: { id: string; name: string; description: string | null; activity_type: string | null; center_lat: number | null; center_lng: number | null; radius_m: number | null; start_date: string | null; end_date: string | null }
  scorecard: { photos: number; analyzed: number; avgTrust: number | null; verifiedPct: number | null; flaggedOrUnscored: number; phases: { gapDays: number; beforeCount: number; afterCount: number } | null; rows: ScorecardRow[] }
  pairs: ManifestPair[]
  assets: ManifestAsset[]
  compliance?: Annex // CSR reports only; absent on older reports, so their hashes are unchanged
}
