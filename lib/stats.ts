// Dashboard landing numbers. PURE. "Verified" uses the same rule as the scorecard and story (trust >= 80 or approved).
import { VERIFIED_SCORE } from "./signals"

export type StatAsset = { resource_type: string; status: string; parent_asset_id: string | null; trust_score: number | null; trust_flags: unknown[] | null; review_status: string }
export type Stats = {
  photos: number; videos: number; frames: number
  analyzed: number; pending: number; failed: number; total: number
  verified: number; scored: number
  awaitingReview: number; rejected: number
}

export function computeStats(assets: StatAsset[]): Stats {
  const s: Stats = { photos: 0, videos: 0, frames: 0, analyzed: 0, pending: 0, failed: 0, total: assets.length, verified: 0, scored: 0, awaitingReview: 0, rejected: 0 }
  for (const a of assets) {
    if (a.resource_type === "video") s.videos++
    else if (a.parent_asset_id) s.frames++
    else s.photos++
    if (a.status === "done") s.analyzed++
    else if (a.status === "failed") s.failed++
    else s.pending++
    if (a.review_status === "rejected") { s.rejected++; continue }
    if (a.trust_score !== null) {
      s.scored++
      if (a.review_status === "approved" || a.trust_score >= VERIFIED_SCORE) s.verified++
    }
    if (a.review_status === "unreviewed" && (a.trust_flags ?? []).length > 0) s.awaitingReview++
  }
  return s
}
