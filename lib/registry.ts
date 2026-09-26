// "Has this photo been used before?" PURE matching against every photo in every project.
// Exact = the same file (MD5, Cloudinary's etag); near = perceptual hash within the near-duplicate distance
// (resized, recompressed, lightly cropped or WhatsApp-forwarded copies). Only fingerprints are compared.
import { hammingDistance, NEAR_DUPLICATE_MAX_DISTANCE } from "./phash"

export type RegistryPhoto = { id: string; etag: string | null; phash: string | null; project_id: string | null; created_at: string; parent_asset_id: string | null }
export type RegistryMatch = { photo: RegistryPhoto; kind: "exact" | "near"; distance: number }
export type RegistryResult = { matches: RegistryMatch[]; firstSeen: RegistryMatch | null; projects: number }

export function findInRegistry(query: { etag: string | null; phash: string | null }, photos: RegistryPhoto[]): RegistryResult {
  const matches: RegistryMatch[] = []
  for (const p of photos) {
    if (query.etag && p.etag === query.etag) { matches.push({ photo: p, kind: "exact", distance: 0 }); continue }
    const d = hammingDistance(query.phash, p.phash)
    if (d !== null && d <= NEAR_DUPLICATE_MAX_DISTANCE) matches.push({ photo: p, kind: "near", distance: d })
  }
  matches.sort((a, b) => a.photo.created_at.localeCompare(b.photo.created_at) || a.distance - b.distance)
  return { matches, firstSeen: matches[0] ?? null, projects: new Set(matches.map((m) => m.photo.project_id ?? "unassigned")).size }
}

export const isMd5 = (s: string) => /^[0-9a-f]{32}$/i.test(s)
export const isPhash = (s: string) => /^[0-9a-f]{16}$/i.test(s)
