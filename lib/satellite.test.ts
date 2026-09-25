import { describe, expect, it } from "vitest"
import { comparisonWindows, satelliteVerdict, sceneShares, siteBox, type SceneSummary } from "./satellite"

const scene = (over: Partial<SceneSummary>): SceneSummary => ({ id: "s", date: "2021-08-25", ndvi: 0.4, vegetationShare: 0.4, bareShare: 0.1, cloudShare: 0, pixels: 3600, ...over })
const day = (iso: string) => iso

describe("comparisonWindows", () => {
  it("compares the same season one year apart", () => {
    expect(comparisonWindows("2021-07-15")).toEqual({ before: { from: "2020-07-15", to: "2020-09-13" }, after: { from: "2021-07-15", to: "2021-09-13" } })
  })
  it("crosses a year boundary", () => {
    expect(comparisonWindows("2025-12-01").after).toEqual({ from: "2025-12-01", to: "2026-01-30" })
    expect(comparisonWindows("2025-12-01").before).toEqual({ from: "2024-12-01", to: "2025-01-30" })
  })
})

describe("siteBox", () => {
  it("is about 2 x radius on each side", () => {
    const [x0, y0, x1, y1] = siteBox(44.7508, -122.4155, 300)
    expect((y1 - y0) * 111_320).toBeCloseTo(600, 0)
    expect((x1 - x0) * 111_320 * Math.cos((44.7508 * Math.PI) / 180)).toBeCloseTo(600, -1)
  })
})

describe("sceneShares", () => {
  it("reads vegetation, bare and cloud/shadow shares from an SCL histogram", () => {
    const s = sceneShares([[50, 30, 10, 5, 5], [4, 5, 8, 3, 6]])
    expect(s).toEqual({ vegetation: 0.5, bare: 0.3, cloud: 0.15, total: 100 })
  })
  it("handles an empty histogram", () => {
    expect(sceneShares([[], []]).cloud).toBe(0)
  })
})

describe("satelliteVerdict", () => {
  it("cleanup: bare ground rising 15+ points is consistent", () => {
    const v = satelliteVerdict("cleanup", scene({ bareShare: 0.13 }), scene({ bareShare: 0.43 }), day)
    expect(v.tone).toBe("consistent")
    expect(v.text).toContain("13% to 43%")
  })
  it("cleanup: a small rise is 'no clear change', never a flag", () => {
    const v = satelliteVerdict("cleanup", scene({ bareShare: 0.13 }), scene({ bareShare: 0.2 }), day)
    expect(v.tone).toBe("no_change")
    expect(v.text).toContain("not a flag")
  })
  it("plantation: NDVI rising 0.05+ is consistent", () => {
    expect(satelliteVerdict("plantation", scene({ ndvi: 0.3 }), scene({ ndvi: 0.36 }), day).tone).toBe("consistent")
    expect(satelliteVerdict("plantation", scene({ ndvi: 0.3 }), scene({ ndvi: 0.33 }), day).tone).toBe("no_change")
  })
  it("never claims proof", () => {
    for (const v of [satelliteVerdict("cleanup", scene({ bareShare: 0 }), scene({ bareShare: 1 }), day), satelliteVerdict(null, scene({ ndvi: 0 }), scene({ ndvi: 1 }), day)]) {
      expect(v.text).toMatch(/consistent with/)
      expect(v.text).not.toMatch(/prove|confirm|fake|fraud/i)
    }
  })
})
