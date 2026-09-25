import { describe, expect, it } from "vitest"
import { computeTrust, trustBand, type TrustAsset, type TrustInput, type TrustOther, type TrustProject } from "./trust"

const site = { lat: 28.9931, lng: 77.0151 }
const project: TrustProject = { center_lat: site.lat, center_lng: site.lng, radius_m: 300, start_date: "2026-09-10", end_date: "2026-09-18" }
const asset = (o: Partial<TrustAsset> = {}): TrustAsset => ({
  id: "b", created_at: "2026-09-20T00:00:00Z", etag: "e-b", phash: "0000000000000000", project_id: "p1", parent_asset_id: null,
  lat: site.lat, lng: site.lng, taken_at: "2026-09-12T10:00:00Z", has_exif: true, ...o,
})
const other = (o: Partial<TrustOther> = {}): TrustOther => ({ id: "a", created_at: "2026-09-19T00:00:00Z", etag: "e-a", phash: "ffffffffffffffff", project_id: "p1", parent_asset_id: null, ...o })
const run = (o: Partial<TrustInput> = {}) => computeTrust({ asset: asset(), project, others: [], checks: null, lowConfidence: false, ...o })
const codes = (r: ReturnType<typeof run>) => r.flags.map((f) => f.code)

describe("trustBand", () => {
  it("uses 80 / 50 boundaries", () => {
    expect(trustBand(100)).toBe("Verified")
    expect(trustBand(80)).toBe("Verified")
    expect(trustBand(79)).toBe("Needs review")
    expect(trustBand(50)).toBe("Needs review")
    expect(trustBand(49)).toBe("Suspicious")
    expect(trustBand(0)).toBe("Suspicious")
  })
})

describe("computeTrust", () => {
  it("a clean photo scores 100 with no flags", () => {
    const r = run()
    expect(r.score).toBe(100)
    expect(r.flags).toEqual([])
  })
  it("exact duplicate of an EARLIER upload: -50", () => {
    const r = run({ others: [other({ etag: "e-b" })] })
    expect(codes(r)).toEqual(["DUPLICATE_EXACT"])
    expect(r.score).toBe(50)
    expect(r.flags[0].evidence.matchAssetId).toBe("a")
  })
  it("the original (earlier) upload is not penalised for being copied", () => {
    const r = run({ others: [other({ etag: "e-b", created_at: "2026-09-21T00:00:00Z" })] })
    expect(r.score).toBe(100)
  })
  it("near duplicate (hamming <= 6): -40, high severity across projects", () => {
    const r = run({ others: [other({ phash: "000000000000003f", project_id: "p2" })] })
    expect(codes(r)).toEqual(["DUPLICATE_REUSED"])
    expect(r.score).toBe(60)
    expect(r.flags[0].severity).toBe("high")
  })
  it("hamming 7 is not a near duplicate", () => {
    expect(codes(run({ others: [other({ phash: "000000000000007f" })] }))).toEqual([])
  })
  it("exact + near duplicate of the same file counts once (-50 only)", () => {
    const r = run({ others: [other({ etag: "e-b", phash: "0000000000000000" })] })
    expect(r.score).toBe(50)
  })
  it("photo of a screen: -35", () => {
    const r = run({ checks: { photo_of_screen_or_print: true, unrelated_to_field_work: false } })
    expect(codes(r)).toEqual(["PHOTO_OF_PHOTO"])
    expect(r.score).toBe(65)
  })
  it("outside geofence: -25 with the distance as evidence", () => {
    const r = run({ asset: asset({ lat: 28.6139, lng: 77.209 }) })
    expect(codes(r)).toEqual(["OUTSIDE_GEOFENCE"])
    expect(r.score).toBe(75)
    expect(Number(r.flags[0].evidence.distanceM)).toBeGreaterThan(45_000)
  })
  it("no GPS means no geofence flag", () => {
    expect(codes(run({ asset: asset({ lat: null, lng: null }) }))).toEqual([])
  })
  it("outside timeframe (beyond ±7 days): -15; inside slack is fine", () => {
    expect(codes(run({ asset: asset({ taken_at: "2026-06-01T10:00:00Z" }) }))).toEqual(["OUTSIDE_TIMEFRAME"])
    expect(run({ asset: asset({ taken_at: "2026-06-01T10:00:00Z" }) }).score).toBe(85)
    expect(codes(run({ asset: asset({ taken_at: "2026-09-24T10:00:00Z" }) }))).toEqual([]) // 6 days after end
    expect(codes(run({ asset: asset({ taken_at: "2026-09-26T10:00:00Z" }) }))).toEqual(["OUTSIDE_TIMEFRAME"]) // 8 days after
  })
  it("unrelated image: -10", () => {
    const r = run({ checks: { photo_of_screen_or_print: false, unrelated_to_field_work: true } })
    expect(codes(r)).toEqual(["IRRELEVANT"])
    expect(r.score).toBe(90)
  })
  it("no metadata caps the score at 60 and is informational", () => {
    const r = run({ asset: asset({ has_exif: false, lat: null, lng: null, taken_at: null }) })
    expect(codes(r)).toEqual(["NO_METADATA"])
    expect(r.flags[0].severity).toBe("info")
    expect(r.score).toBe(60)
  })
  it("deductions stack and clamp at 0", () => {
    const r = run({
      asset: asset({ lat: 28.6, lng: 77.2, taken_at: "2026-01-01T00:00:00Z", has_exif: true }),
      others: [other({ etag: "e-b" })],
      checks: { photo_of_screen_or_print: true, unrelated_to_field_work: true },
    })
    expect(r.score).toBe(0)
    expect(r.band).toBe("Suspicious")
  })
  it("low confidence adds an info flag and no deduction", () => {
    const r = run({ lowConfidence: true })
    expect(codes(r)).toEqual(["LOW_CONFIDENCE"])
    expect(r.score).toBe(100)
  })
  it("near-identical frames of the SAME video are not flagged as reused (tripod shots)", () => {
    const frame = asset({ id: "f2", parent_asset_id: "video1", phash: "0000000000000000", etag: "e-f2" })
    const sibling = other({ id: "f1", parent_asset_id: "video1", phash: "0000000000000001", etag: "e-f1" })
    expect(codes(run({ asset: frame, others: [sibling] }))).toEqual([])
    expect(codes(run({ asset: frame, others: [other({ id: "video1", phash: "0000000000000000", etag: "e-f2" })] }))).toEqual([]) // its own video
  })
  it("a frame that duplicates a photo from a DIFFERENT source is still flagged", () => {
    const frame = asset({ id: "f2", parent_asset_id: "video1", phash: "0000000000000000" })
    expect(codes(run({ asset: frame, others: [other({ id: "photo9", phash: "0000000000000003" })] }))).toEqual(["DUPLICATE_REUSED"])
  })
  it("no project means no geofence/timeframe checks", () => {
    expect(codes(run({ project: null, asset: asset({ lat: 0, lng: 0, taken_at: "2020-01-01T00:00:00Z" }) }))).toEqual([])
  })
  it("never uses the words fake or fraud in reasons", () => {
    const r = run({
      asset: asset({ lat: 28.6, lng: 77.2, taken_at: "2026-01-01T00:00:00Z" }),
      others: [other({ etag: "e-b" })],
      checks: { photo_of_screen_or_print: true, unrelated_to_field_work: true },
    })
    for (const f of r.flags) expect(f.reason.toLowerCase()).not.toMatch(/\bfake|fraud/)
    const noMeta = run({ asset: asset({ has_exif: false }), lowConfidence: true })
    for (const f of noMeta.flags) expect(f.reason.toLowerCase()).not.toMatch(/\bfake|fraud/)
  })
})
