import { describe, expect, it } from "vitest"
import { clusterPoints, haversineM, type GeoPoint } from "./geo"

const DAY = 86_400_000
const T0 = Date.UTC(2026, 8, 1)
const site = { lat: 28.9931, lng: 77.0151 }
// ~0.001 degrees latitude is about 111 m
const at = (id: string, dLat: number, days: number, base = site): GeoPoint => ({ id, lat: base.lat + dLat, lng: base.lng, time: T0 + days * DAY })

describe("haversineM", () => {
  it("is 0 for the same point", () => expect(haversineM(site, site)).toBe(0))
  it("one degree of latitude is about 111.2 km", () => {
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeGreaterThan(111_000)
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeLessThan(111_400)
  })
  it("Sonipat to Delhi is roughly 46 km", () => {
    const d = haversineM(site, { lat: 28.6139, lng: 77.209 })
    expect(d).toBeGreaterThan(45_000)
    expect(d).toBeLessThan(47_500)
  })
})

describe("clusterPoints", () => {
  it("groups nearby photos taken close in time", () => {
    const out = clusterPoints([at("a", 0, 0), at("b", 0.001, 2), at("c", 0.0015, 5)])
    expect(out).toHaveLength(1)
    expect(out[0].ids.sort()).toEqual(["a", "b", "c"])
  })
  it("splits by distance (> 500 m apart)", () => {
    const out = clusterPoints([at("a", 0, 0), at("b", 0, 1), at("c", 0, 2), at("d", 0.02, 0), at("e", 0.02, 1), at("f", 0.02, 2)])
    expect(out).toHaveLength(2)
  })
  it("splits by time (> 60 days from the cluster's span)", () => {
    const out = clusterPoints([at("a", 0, 0), at("b", 0, 1), at("c", 0, 2), at("d", 0, 100), at("e", 0, 101), at("f", 0, 102)])
    expect(out).toHaveLength(2)
  })
  it("keeps a photo within 60 days of the span edge", () => {
    const out = clusterPoints([at("a", 0, 0), at("b", 0, 30), at("c", 0, 80)])
    expect(out).toHaveLength(1)
  })
  it("drops clusters smaller than minSize and reports the span and a suggested radius", () => {
    expect(clusterPoints([at("a", 0, 0), at("b", 0, 1)])).toHaveLength(0)
    const [c] = clusterPoints([at("a", 0, 0), at("b", 0.001, 3), at("c", 0, 7)])
    expect(c.start).toBe(T0)
    expect(c.end).toBe(T0 + 7 * DAY)
    expect(c.radiusM).toBeGreaterThanOrEqual(200)
  })
  it("is deterministic regardless of input order", () => {
    const pts = [at("c", 0, 5), at("a", 0, 0), at("b", 0.0005, 2)]
    expect(clusterPoints(pts)[0].ids.sort()).toEqual(clusterPoints([...pts].reverse())[0].ids.sort())
  })
})
