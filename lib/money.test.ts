import { describe, expect, it } from "vitest"
import { badgeSvg, costPerOutcome, inr } from "./money"

describe("badge", () => {
  it("shows the verified share and colours it by band", () => {
    const svg = badgeSvg({ verified: 6, total: 9 })
    expect(svg).toContain("67% · 6 of 9 photos")
    expect(svg).toContain('fill="#8A5600"') // needs-review amber
    expect(badgeSvg({ verified: 9, total: 10 })).toContain('fill="#237A4B"')
    expect(badgeSvg({ verified: 1, total: 10 })).toContain('fill="#B3261E"')
  })
  it("is valid, labelled SVG even with no photos", () => {
    const svg = badgeSvg({ verified: 0, total: 0 })
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    expect(svg).toContain('aria-label="verified by Overlook: no photos yet"')
  })
})

describe("cost per verified outcome", () => {
  it("divides the grant by verified photos and verified before/after spots", () => {
    expect(costPerOutcome({ grantInr: 500000, verifiedPhotos: 6, verifiedSpots: 3, releasablePct: 70 })).toEqual({ perPhoto: 83333, perSpot: 166667, releasableInr: 350000 })
  })
  it("says nothing rather than dividing by zero", () => {
    expect(costPerOutcome({ grantInr: 100000, verifiedPhotos: 0, verifiedSpots: 0, releasablePct: null })).toEqual({ perPhoto: null, perSpot: null, releasableInr: null })
  })
  it("formats rupees with Indian digit grouping", () => {
    expect(inr(1234567)).toBe("₹12,34,567")
  })
})
