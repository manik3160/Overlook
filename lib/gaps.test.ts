import { describe, expect, it } from "vitest"
import { findGaps, SAME_SPOT_M, type GapInput, type GapPhoto } from "./gaps"

const C = { lat: 28.6, lng: 77.2 }
const DAY = 86_400_000
const T0 = Date.parse("2026-10-01T05:00:00Z")
const mPerLng = 111_320 * Math.cos((C.lat * Math.PI) / 180)
// a photo `north`/`east` metres from the centre
const at = (id: string, north: number, east: number, o: Partial<GapPhoto> = {}): GapPhoto => ({
  id, lat: C.lat + north / 111_320, lng: C.lng + east / mPerLng, time: T0, tags: [], trustScore: 100, reviewStatus: "unreviewed", isImage: true, isRetake: false, ...o,
})
const input = (photos: GapPhoto[], o: Partial<GapInput> = {}): GapInput => ({
  project: { center: C, radiusM: 300, startDate: "2026-09-01", endDate: "2026-12-31", activityType: null }, photos, pairedIds: new Set(), beforeIds: null, now: T0 + DAY, ...o,
})
const kinds = (r: ReturnType<typeof findGaps>) => r.gaps.map((g) => g.kind)

describe("after photos", () => {
  it("one retake shot per unpaired spot, ghosted on the best photo there", () => {
    const r = findGaps(input([at("a", 0, 0, { trustScore: 70 }), at("b", 5, 0), at("far", 200, 0)]))
    const retakes = r.shots.filter((s) => s.kind === "retake")
    expect(retakes.map((s) => s.ghostId)).toEqual(["b", "far"]) // a and b are one spot (<15 m); b has more trust
    expect(r.gaps.find((g) => g.kind === "after_photos")?.text).toBe("2 spots have a before photo but no after photo.")
  })
  it("skips paired photos, retakes, after-phase photos and rejected photos", () => {
    const r = findGaps(input([at("paired", 0, 0), at("retake", 100, 0, { isRetake: true }), at("after", -100, 0), at("rej", 0, 100, { reviewStatus: "rejected" })], { pairedIds: new Set(["paired"]), beforeIds: new Set(["paired", "retake", "rej"]) }))
    expect(r.shots.filter((s) => s.kind === "retake")).toEqual([])
    expect(kinds(r)).not.toContain("after_photos")
  })
  it(`uses a ${SAME_SPOT_M} m spot radius`, () => {
    expect(findGaps(input([at("a", 0, 0), at("b", SAME_SPOT_M + 2, 0)])).shots.filter((s) => s.kind === "retake")).toHaveLength(2)
  })
})

describe("coverage", () => {
  it("names the empty parts of the site and pins a shot in each", () => {
    // photos only in the north-west, centre and south-east cells
    const r = findGaps(input([at("nw", 200, -200, { isRetake: true }), at("c", 0, 0, { isRetake: true }), at("se", -200, 200, { isRetake: true })]))
    const cov = r.shots.filter((s) => s.kind === "coverage").map((s) => s.title)
    expect(cov).toHaveLength(6)
    expect(cov).toContain("Cover the north-east part of the site")
    expect(r.gaps.find((g) => g.kind === "coverage")?.text).toBe("No photos from the north, north-east, west, east, south-west, south parts of the site.")
    const ne = r.shots.find((s) => s.key === "coverage:0,2")!
    expect(ne.lat).toBeGreaterThan(C.lat)
    expect(ne.lng).toBeGreaterThan(C.lng)
  })
  it("waits for 3 geotagged photos and needs a project centre", () => {
    expect(kinds(findGaps(input([at("a", 0, 0), at("b", 200, 200)])))).not.toContain("coverage")
    const noCentre = input([at("a", 0, 0), at("b", 1, 1), at("c", 2, 2)])
    noCentre.project.center = null
    expect(kinds(findGaps(noCentre))).not.toContain("coverage")
  })
})

describe("expected activities", () => {
  it("counts only verified photos with the tag", () => {
    const r = findGaps(input([at("a", 0, 0, { tags: ["garbage_present"] }), at("b", 0, 0, { tags: ["cleanup_drive"], trustScore: 50 })], { project: { center: C, radiusM: 300, startDate: null, endDate: null, activityType: "cleanup" } }))
    expect(r.gaps.find((g) => g.kind === "activity")?.text).toBe("1 of 2 expected activities have no verified photo: people cleaning up.")
  })
  it("approved photos count even with a low score", () => {
    const r = findGaps(input([at("a", 0, 0, { tags: ["classroom"], trustScore: 40, reviewStatus: "approved" })], { project: { center: C, radiusM: 300, startDate: null, endDate: null, activityType: "education" } }))
    expect(kinds(r)).not.toContain("activity")
  })
})

describe("time", () => {
  it("asks for after photos once the project has ended", () => {
    const r = findGaps(input([at("a", 0, 0)], { now: Date.parse("2027-01-15T00:00:00Z") }))
    expect(r.gaps.find((g) => g.kind === "time")?.text).toBe("The project ended on 2026-12-31 and there is no photo taken after that date.")
  })
  it("is satisfied by a photo after the end date", () => {
    const r = findGaps(input([at("a", 0, 0), at("b", 0, 0, { time: Date.parse("2027-01-05T00:00:00Z") })], { now: Date.parse("2027-01-15T00:00:00Z") }))
    expect(kinds(r)).not.toContain("time")
  })
  it("nudges an ongoing project that has gone quiet", () => {
    const r = findGaps(input([at("a", 0, 0)], { now: T0 + 40 * DAY }))
    expect(r.gaps.find((g) => g.kind === "time")?.text).toBe("No new photos for 40 days (last on 2026-10-01).")
  })
})

describe("review and location", () => {
  it("counts flagged unreviewed photos and photos with no location", () => {
    const r = findGaps(input([at("a", 0, 0, { trustScore: 55 }), at("b", 0, 0, { trustScore: 55, reviewStatus: "approved" }), { ...at("c", 0, 0), lat: null, lng: null }]))
    expect(r.gaps.find((g) => g.kind === "review")?.text).toBe("1 photo is flagged for review and not counted as verified yet.")
    expect(r.gaps.find((g) => g.kind === "no_location")?.action).toBe(false)
  })
  it("a complete project passes every check", () => {
    const photos = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => at(`p${r}${c}`, 200 - r * 200, -200 + c * 200, { isRetake: true, tags: ["garbage_present", "cleanup_drive"] })))
    const r = findGaps(input(photos, { project: { center: C, radiusM: 300, startDate: "2026-09-01", endDate: "2026-12-31", activityType: "cleanup" } }))
    expect(r.gaps).toEqual([])
    expect(r.passed).toBe(r.checks)
  })
})
