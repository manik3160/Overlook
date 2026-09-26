import { describe, expect, it } from "vitest"
import { buildAnnex, complianceInputSchema, SCHEDULE_VII, suggestCompliance, type AnnexAsset } from "./compliance"

const a = (o: Partial<AnnexAsset> = {}): AnnexAsset => ({ trust_score: 100, review_status: "unreviewed", lat: 1, lng: 2, taken_at: "2026-10-01T00:00:00Z", flags: [], ...o })

describe("compliance annex", () => {
  it("suggests a category and SDGs per activity, with a safe default", () => {
    expect(suggestCompliance("cleanup")).toEqual({ category: SCHEDULE_VII[3], sdgs: [11, 12, 15] })
    expect(suggestCompliance("health_camp").sdgs).toEqual([3])
    expect(suggestCompliance(null).sdgs).toEqual([])
  })
  it("counts verified, flagged, not scored, captured live, location and time", () => {
    const annex = buildAnnex({ scheduleVii: SCHEDULE_VII[3], sdgs: [15, 11, 15] }, [
      a(), a({ trust_score: 55 }), a({ trust_score: 40, review_status: "approved" }), a({ trust_score: null, lat: null, lng: null, taken_at: null }),
      a({ flags: [{ code: "CAPTURED_LIVE" }] }),
    ], [{ title: "Start", release_pct: 30, ready: true }])
    expect(annex.evidence).toEqual({ photos: 5, verified: 3, verified_pct: 60, flagged_for_review: 1, not_scored: 1, captured_live: 1, with_location: 4, with_time: 4 })
    expect(annex.sdgs).toEqual([{ number: 11, name: "Sustainable cities and communities" }, { number: 15, name: "Life on land" }])
    expect(annex.milestones).toHaveLength(1)
  })
  it("says what it is not, and uses plain ASCII for the PDF fonts", () => {
    const annex = buildAnnex({ scheduleVii: SCHEDULE_VII[0], sdgs: [3] }, [], [])
    expect(annex.note).toMatch(/not an impact assessment by an independent agency and does not certify compliance/)
    expect(annex.evidence.verified_pct).toBeNull()
    expect(/^[\x20-\x7E]*$/.test([annex.note, ...SCHEDULE_VII, ...annex.sdgs.map((s) => s.name)].join(""))).toBe(true)
  })
  it("only accepts listed categories and SDGs 1 to 17", () => {
    expect(complianceInputSchema.safeParse({ scheduleVii: "Space tourism", sdgs: [] }).success).toBe(false)
    expect(complianceInputSchema.safeParse({ scheduleVii: SCHEDULE_VII[1], sdgs: [18] }).success).toBe(false)
    expect(complianceInputSchema.safeParse({ scheduleVii: SCHEDULE_VII[1], sdgs: [4] }).success).toBe(true)
  })
})
