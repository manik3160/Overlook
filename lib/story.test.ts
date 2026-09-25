import { describe, expect, it } from "vitest"
import { footerLine, headline, improvements, subline, narrativeGrounded, pickBestPair, templateNarrative, topNumbers, type StoryFacts } from "./story"
import type { MetricKey, Scorecard } from "./signals"

const cell = (hits: number, total: number) => ({ hits, total })
const row = (key: MetricKey, before: [number, number] | null, after: [number, number] | null) => ({ key, label: key, before: before && cell(...before), after: after && cell(...after), all: cell(0, 1) })
const sc = (rows: Scorecard["rows"], o: Partial<Scorecard> = {}): Scorecard => ({ photos: 7, analyzed: 7, avgTrust: 94, verifiedPct: 86, flaggedOrUnscored: 1, phases: null, rows, ...o })
const cleanup = sc([
  row("garbage_visible", [3, 3], [0, 3]), row("vegetation_dense", [0, 3], [2, 3]), row("water_present", [1, 3], [1, 3]), row("people_working", [1, 3], [1, 3]),
])

describe("improvements", () => {
  it("counts a DROP in garbage as an improvement and a rise in greenery, biggest first", () => {
    const d = improvements(cleanup)
    expect(d.map((x) => x.key)).toEqual(["garbage_visible", "vegetation_dense"])
    expect(d[0]).toMatchObject({ before: 100, after: 0, improvement: 100 })
    expect(d[1]).toMatchObject({ before: 0, after: 67 })
  })
  it("ignores unchanged or worsened metrics and rows without before/after data", () => {
    expect(improvements(sc([row("garbage_visible", [0, 3], [3, 3]), row("water_present", null, null), row("safety_gear", [0, 0], [1, 2])]))).toEqual([])
  })
})

describe("headline / topNumbers", () => {
  it("headline uses the biggest improvement in English and Hindi", () => {
    const h = headline(cleanup, 6, "Cleanup")
    expect(h.en).toBe("Garbage visible: 100% to 0%")
    expect(h.hi).toBe("कचरा दिखने वाली फोटो: 100% से 0%")
  })
  it("headline falls back to the verified photo count", () => {
    expect(headline(sc([]), 5, "Pond").en).toBe("5 verified photos from Pond")
    expect(headline(sc([]), 5, "Pond").hi).toContain("5")
  })
  it("Hindi headline/subline never contain Latin letters (Noto Devanagari has no Latin glyphs)", () => {
    expect(headline(sc([]), 5, "Pond Restoration").hi).not.toMatch(/[A-Za-z]/)
    expect(headline(cleanup, 6, "Cleanup").hi).not.toMatch(/[A-Za-z]/)
    expect(subline("Pond Restoration", 6).hi).not.toMatch(/[A-Za-z]/)
    expect(footerLine("Pond Restoration")).toBe("Pond Restoration | Overlook")
  })
  it("always returns exactly three numbers, topping up with evidence quality", () => {
    expect(topNumbers(cleanup, 6)).toHaveLength(3)
    expect(topNumbers(cleanup, 6)[0]).toEqual({ label: "Garbage visible", value: "100% to 0%" })
    const none = topNumbers(sc([]), 4)
    expect(none.map((n) => n.label)).toEqual(["Verified photos", "Evidence coverage", "Average trust score"])
  })
})

describe("pickBestPair (verified evidence only)", () => {
  const trust = new Map([["b1", 100], ["a1", 100], ["b2", 85], ["a2", 90]])
  it("ignores pairs where either photo is not verified", () => {
    expect(pickBestPair([{ beforeId: "b1", afterId: "unverified", distanceM: 1 }], trust)).toBeNull()
  })
  it("prefers the pair whose weaker photo is more trusted, then the closer one", () => {
    const best = pickBestPair([{ beforeId: "b2", afterId: "a2", distanceM: 1 }, { beforeId: "b1", afterId: "a1", distanceM: 30 }], trust)
    expect(best?.beforeId).toBe("b1")
    const tie = pickBestPair([{ beforeId: "b1", afterId: "a1", distanceM: 30 }, { beforeId: "b1", afterId: "a1", distanceM: 5 }], trust)
    expect(tie?.distanceM).toBe(5)
  })
  it("returns null when there are no pairs", () => expect(pickBestPair([], trust)).toBeNull())
})

describe("narrative grounding", () => {
  const facts: StoryFacts = { projectName: "Sonipat Cleanup", activity: "cleanup", description: null, startDate: "2026-09-01", endDate: "2026-09-16", verifiedPhotos: 6, totalPhotos: 7, numbers: [{ label: "Garbage visible", value: "100% to 0%" }], captions: [], pairSummary: null }
  const ftext = JSON.stringify(facts)
  it("accepts a narrative that only uses numbers from the facts", () => {
    expect(narrativeGrounded({ problem: "Litter covered the lane.", action: "Volunteers cleaned it from 2026-09-01.", result: "Garbage fell from 100% to 0% across 6 verified photos." }, ftext)).toBe(true)
  })
  it("treats a written-out date as grounded by an ISO date (1 == 01)", () => {
    expect(narrativeGrounded({ problem: "p", action: "Volunteers worked between September 1 and September 16, 2026.", result: "Garbage fell from 100% to 0%." }, ftext)).toBe(true)
  })
  it("rejects invented figures", () => {
    expect(narrativeGrounded({ problem: "p", action: "a", result: "Over 500 volunteers removed 2 tonnes." }, ftext)).toBe(false)
    expect(narrativeGrounded({ problem: "p", action: "a", result: "Garbage fell from 100% to 5%." }, ftext)).toBe(false)
  })
  it("the template fallback is itself grounded", () => {
    expect(narrativeGrounded(templateNarrative(facts), ftext)).toBe(true)
  })
})
