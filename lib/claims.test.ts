import { describe, expect, it } from "vitest"
import { judgeClaim, summarize, type Claim, type ClaimMatch } from "./claims"

const claim = (o: Partial<Claim> = {}): Claim => ({ text: "We cleared the riverbank", type: "activity", subject: "people clearing litter", number: null, unit: null, dateFrom: null, dateTo: null, ...o })
const m = (id: string, o: Partial<ClaimMatch> = {}): ClaimMatch => ({ id, verified: true, time: Date.parse("2026-10-05T06:00:00Z"), inPair: false, ...o })

describe("judgeClaim", () => {
  it("activity: 2+ verified photos = supported, 1 = partly", () => {
    expect(judgeClaim(claim(), [m("a"), m("b")])).toMatchObject({ verdict: "supported", photoIds: ["a", "b"] })
    expect(judgeClaim(claim(), [m("a")]).verdict).toBe("partly")
  })
  it("no matches = no evidence found (never 'false')", () => {
    const r = judgeClaim(claim(), [])
    expect(r.verdict).toBe("no_evidence")
    expect(r.reason).not.toMatch(/false|fake|fraud|lie/i)
  })
  it("matches that are only flagged photos do not count", () => {
    const r = judgeClaim(claim(), [m("a", { verified: false }), m("b", { verified: false })])
    expect(r).toMatchObject({ verdict: "partly", photoIds: [] })
    expect(r.reason).toContain("flagged for review")
  })
  it("change needs a before/after pair to be supported", () => {
    expect(judgeClaim(claim({ type: "change" }), [m("a"), m("b")]).verdict).toBe("partly")
    expect(judgeClaim(claim({ type: "change" }), [m("a"), m("b", { inPair: true })]).verdict).toBe("supported")
  })
  it("quantity is at best partly: numbers cannot be counted from photos", () => {
    const r = judgeClaim(claim({ type: "quantity", number: 500, unit: "saplings" }), [m("a"), m("b"), m("c")])
    expect(r.verdict).toBe("partly")
    expect(r.reason).toContain("(500 saplings) cannot be confirmed")
    expect(judgeClaim(claim({ type: "change" }), [m("a", { inPair: true })]).reason).toMatch(/^1 verified photo shows this/)
  })
  it("dated claims only count photos in the window", () => {
    const c = claim({ dateFrom: "2026-10-01", dateTo: "2026-10-31" })
    expect(judgeClaim(c, [m("a"), m("b")]).verdict).toBe("supported")
    const outside = judgeClaim(c, [m("a", { time: Date.parse("2026-12-01T00:00:00Z") })])
    expect(outside.verdict).toBe("partly")
    expect(outside.reason).toContain("none is dated 2026-10-01 to 2026-10-31")
    expect(judgeClaim(c, [m("u", { time: null }), m("v", { time: null })]).verdict).toBe("partly") // undated cannot prove a date
  })
  it("summarize counts each verdict", () => {
    expect(summarize([judgeClaim(claim(), [m("a"), m("b")]), judgeClaim(claim(), []), judgeClaim(claim(), [m("a")])])).toEqual({ supported: 1, partly: 1, noEvidence: 1 })
  })
})
