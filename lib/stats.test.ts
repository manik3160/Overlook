import { describe, expect, it } from "vitest"
import { computeStats, type StatAsset } from "./stats"

const a = (o: Partial<StatAsset> = {}): StatAsset => ({ resource_type: "image", status: "done", parent_asset_id: null, trust_score: 100, trust_flags: [], review_status: "unreviewed", ...o })

describe("computeStats", () => {
  it("is all zeros for an empty library", () => {
    expect(computeStats([])).toMatchObject({ total: 0, photos: 0, videos: 0, verified: 0, awaitingReview: 0 })
  })
  it("separates photos, videos and video frames", () => {
    const s = computeStats([a(), a(), a({ resource_type: "video" }), a({ parent_asset_id: "v1" })])
    expect(s).toMatchObject({ photos: 2, videos: 1, frames: 1, total: 4 })
  })
  it("counts analysis progress", () => {
    const s = computeStats([a(), a({ status: "pending" }), a({ status: "analyzing" }), a({ status: "failed" })])
    expect(s).toMatchObject({ analyzed: 1, pending: 2, failed: 1 })
  })
  it("verified = trust >= 80 or approved; rejected photos are excluded from trust numbers", () => {
    const s = computeStats([a({ trust_score: 90 }), a({ trust_score: 60 }), a({ trust_score: 60, review_status: "approved" }), a({ trust_score: 20, review_status: "rejected" }), a({ trust_score: null })])
    expect(s).toMatchObject({ verified: 2, scored: 3, rejected: 1 })
  })
  it("awaiting review = flagged and still unreviewed", () => {
    const flagged = [{ code: "NO_METADATA" }]
    const s = computeStats([a({ trust_flags: flagged }), a({ trust_flags: flagged, review_status: "approved" }), a({ trust_flags: flagged, review_status: "rejected" }), a()])
    expect(s.awaitingReview).toBe(1)
  })
})
