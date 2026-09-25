import { describe, expect, it } from "vitest"
import { computeScorecard, photosFor, splitPhases, type ScoreAsset, type Signals } from "./signals"

const DAY = 86_400_000
const T0 = Date.UTC(2026, 8, 1)
const sig = (o: Partial<Signals> = {}): Signals => ({ people_working: 0, water_present: false, garbage_visible: false, vegetation: "none", structure_stage: "none", safety_gear: false, ...o })
const a = (id: string, day: number | null, signals: Signals | null = sig(), o: Partial<ScoreAsset> = {}): ScoreAsset => ({
  id, time: day === null ? null : T0 + day * DAY, status: signals ? "done" : "pending", signals, trust_score: 100, review_status: "unreviewed", ...o,
})

// 3 "before" photos on days 0-1 (2 with garbage), 4 "after" photos on days 15-16 (none with garbage, 3 dense vegetation)
const cleanup: ScoreAsset[] = [
  a("b1", 0, sig({ garbage_visible: true })), a("b2", 0, sig({ garbage_visible: true })), a("b3", 1, sig()),
  a("a1", 15, sig({ vegetation: "dense" })), a("a2", 15, sig({ vegetation: "dense" })), a("a3", 16, sig({ vegetation: "dense" })), a("a4", 16, sig()),
]

describe("splitPhases", () => {
  it("cuts at the biggest gap (>= 3 days)", () => {
    const ph = splitPhases(cleanup)!
    expect([...ph.before].sort()).toEqual(["b1", "b2", "b3"])
    expect([...ph.after].sort()).toEqual(["a1", "a2", "a3", "a4"])
    expect(ph.gapDays).toBe(14)
  })
  it("returns null when every gap is under 3 days, or with one photo", () => {
    expect(splitPhases([a("x", 0), a("y", 2), a("z", 4)])).toBeNull()
    expect(splitPhases([a("x", 0)])).toBeNull()
  })
  it("a photo flagged as outside the project's dates cannot define the phases (it would become a 1-photo 'before')", () => {
    const withOutlier = [...cleanup, a("june", -92, sig(), { outsideTimeframe: true })]
    const ph = splitPhases(withOutlier)!
    expect([...ph.before].sort()).toEqual(["b1", "b2", "b3"])
    expect(ph.before.has("june") || ph.after.has("june")).toBe(false)
    expect(computeScorecard(withOutlier).rows[0].all.total).toBe(8) // still counted overall
    expect(photosFor(withOutlier, "garbage_visible", "all", "total")).toContain("june")
  })
  it("ignores photos without a time", () => {
    const ph = splitPhases([...cleanup, a("notime", null)])!
    expect(ph.before.has("notime") || ph.after.has("notime")).toBe(false)
  })
})

describe("computeScorecard", () => {
  const sc = computeScorecard(cleanup)
  const row = (k: string) => sc.rows.find((r) => r.key === k)!
  it("garbage visible: 2/3 before -> 0/4 after", () => {
    expect(row("garbage_visible").before).toEqual({ hits: 2, total: 3 })
    expect(row("garbage_visible").after).toEqual({ hits: 0, total: 4 })
    expect(row("garbage_visible").all).toEqual({ hits: 2, total: 7 })
  })
  it("dense vegetation: 0/3 before -> 3/4 after", () => {
    expect(row("vegetation_dense").before).toEqual({ hits: 0, total: 3 })
    expect(row("vegetation_dense").after).toEqual({ hits: 3, total: 4 })
  })
  it("phase summary and totals", () => {
    expect(sc.phases).toMatchObject({ beforeCount: 3, afterCount: 4, gapDays: 14 })
    expect(sc.photos).toBe(7)
    expect(sc.analyzed).toBe(7)
    expect(sc.avgTrust).toBe(100)
    expect(sc.verifiedPct).toBe(100)
  })
  it("only analysed photos count toward the denominators", () => {
    const s = computeScorecard([...cleanup, a("pending-after", 16, null)])
    expect(s.rows[0].after!.total).toBe(4)
    expect(s.photos).toBe(8)
    expect(s.analyzed).toBe(7)
  })
  it("verified coverage counts trust >= 80 or approved; avg trust is rounded", () => {
    const s = computeScorecard([a("p", 0, sig(), { trust_score: 60 }), a("q", 1, sig(), { trust_score: 60, review_status: "approved" }), a("r", 2, sig(), { trust_score: 95 })])
    expect(s.verifiedPct).toBe(67)
    expect(s.avgTrust).toBe(72)
    expect(s.flaggedOrUnscored).toBe(1)
  })
  it("has no before/after columns without a 3-day gap", () => {
    const s = computeScorecard([a("x", 0), a("y", 1)])
    expect(s.phases).toBeNull()
    expect(s.rows[0].before).toBeNull()
  })
})

describe("photosFor traces every number to its photos", () => {
  it("matches the scorecard cells exactly", () => {
    const sc = computeScorecard(cleanup)
    for (const r of sc.rows) {
      for (const set of ["before", "after", "all"] as const) {
        const cell = r[set]!
        expect(photosFor(cleanup, r.key, set, "hits")).toHaveLength(cell.hits)
        expect(photosFor(cleanup, r.key, set, "total")).toHaveLength(cell.total)
      }
    }
    expect(photosFor(cleanup, "garbage_visible", "before", "hits").sort()).toEqual(["b1", "b2"])
  })
})
