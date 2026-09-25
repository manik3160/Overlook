import { describe, expect, it } from "vitest"
import { cosine, findPairs, type PairCandidate } from "./pairing"

const DAY = 86_400_000
const T0 = Date.UTC(2026, 8, 1)
const site = { lat: 28.9931, lng: 77.0151 }
// 0.0001 degrees of latitude is about 11 m
const c = (id: string, metres: number, days: number, embedding: number[] | null = null): PairCandidate => ({ id, lat: site.lat + metres / 111_195, lng: site.lng, time: T0 + days * DAY, embedding })

describe("findPairs", () => {
  it("pairs a before with a later after at the same spot", () => {
    const [p] = findPairs([c("b", 0, 0)], [c("a", 5, 14)])
    expect(p).toMatchObject({ beforeId: "b", afterId: "a", daysApart: 14 })
    expect(p.distanceM).toBeLessThan(6)
  })
  it("requires <= 50 m", () => {
    expect(findPairs([c("b", 0, 0)], [c("a", 49, 14)])).toHaveLength(1)
    expect(findPairs([c("b", 0, 0)], [c("a", 60, 14)])).toHaveLength(0)
  })
  it("requires >= 3 days apart", () => {
    expect(findPairs([c("b", 0, 0)], [c("a", 0, 3)])).toHaveLength(1)
    expect(findPairs([c("b", 0, 0)], [c("a", 0, 2.9)])).toHaveLength(0)
  })
  it("the earlier photo is always the before (never pairs backwards)", () => {
    expect(findPairs([c("late", 0, 20)], [c("early", 0, 0)])).toHaveLength(0)
  })
  it("picks the closest before-photo", () => {
    const [p] = findPairs([c("far", 40, 0), c("near", 5, 0)], [c("a", 0, 14)])
    expect(p.beforeId).toBe("near")
  })
  it("breaks GPS-jitter ties (within 10 m) by embedding similarity", () => {
    const same = [1, 0, 0], other = [0, 1, 0]
    const [p] = findPairs([c("similar", 8, 0, same), c("closerButDifferent", 2, 0, other)], [c("a", 0, 14, same)])
    expect(p.beforeId).toBe("similar")
  })
  it("uses each before-photo at most once", () => {
    const pairs = findPairs([c("b1", 0, 0)], [c("a1", 1, 14), c("a2", 2, 15)])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].afterId).toBe("a1") // the tighter match wins
  })
  it("gives a second after-photo the next-best before-photo", () => {
    const pairs = findPairs([c("b1", 0, 0), c("b2", 30, 0)], [c("a1", 1, 14), c("a2", 2, 15)])
    expect(pairs.map((p) => `${p.beforeId}>${p.afterId}`).sort()).toEqual(["b1>a1", "b2>a2"])
  })
  it("returns nothing when there is nothing to pair", () => {
    expect(findPairs([], [c("a", 0, 14)])).toEqual([])
    expect(findPairs([c("b", 0, 0)], [])).toEqual([])
  })
})

describe("cosine", () => {
  it("is 1 for identical, 0 for orthogonal or missing vectors", () => {
    expect(cosine([1, 2], [1, 2])).toBeCloseTo(1)
    expect(cosine([1, 0], [0, 1])).toBe(0)
    expect(cosine(null, [1])).toBe(0)
  })
})
