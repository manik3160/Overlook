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
  it("a live signed capture adds CAPTURED_LIVE and is not capped, even without EXIF", () => {
    const r = run({ asset: asset({ has_exif: false, captured_live: true }) })
    expect(codes(r)).toEqual(["CAPTURED_LIVE"])
    expect(r.flags[0].severity).toBe("info")
    expect(r.score).toBe(100)
  })
  it("a live capture still loses points for real problems (wrong place)", () => {
    const r = run({ asset: asset({ has_exif: false, captured_live: true, lat: 28.6, lng: 77.2 }) })
    expect(codes(r)).toEqual(["OUTSIDE_GEOFENCE", "CAPTURED_LIVE"])
    expect(r.score).toBe(75)
  })
  it("wording never claims proof", () => {
    const r = run({ asset: asset({ captured_live: true }) })
    expect(r.flags[0].reason).not.toMatch(/fake|fraud|guarantee|proof of/i)
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

describe("cross-organisation reuse", () => {
  it("names the other organisation when a near-copy comes from another NGO", () => {
    const r = run({ asset: asset({ org: "Green Earth" }), others: [other({ phash: "0000000000000001", project_id: "p2", org: "Blue River Trust" })] })
    const f = r.flags.find((x) => x.code === "DUPLICATE_REUSED")!
    expect(f.reason).toContain("from another organisation (Blue River Trust)")
    expect(f.evidence.otherOrganization).toBe("Blue River Trust")
  })
  it("same organisation (any case) keeps the normal wording", () => {
    const r = run({ asset: asset({ org: "Green Earth" }), others: [other({ phash: "0000000000000001", project_id: "p2", org: "green earth " })] })
    expect(r.flags[0].reason).toContain("from a different project")
  })
})

describe("impossible travel", () => {
  const signed = (o: Partial<TrustAsset> = {}) => asset({ device: "dev1", taken_at: "2026-09-12T10:00:00Z", ...o })
  // ~84 km north of the site
  const far = { lat: site.lat + 0.755, lng: site.lng }
  it("flags the same device 84 km away 10 minutes later (-30)", () => {
    const r = run({ asset: signed(), others: [other({ device: "dev1", ...far, taken_at: "2026-09-12T10:10:00Z" })] })
    const f = r.flags.find((x) => x.code === "IMPOSSIBLE_TRAVEL")!
    expect(f.reason).toBe("Flagged for review: the same device also signed a photo 84 km away 10 minutes apart, faster than any road journey.")
    expect(r.score).toBe(70)
  })
  it("checks both directions in time (the earlier photo is flagged too)", () => {
    expect(codes(run({ asset: signed(), others: [other({ device: "dev1", ...far, taken_at: "2026-09-12T09:55:00Z" })] }))).toContain("IMPOSSIBLE_TRAVEL")
  })
  it("allows a real journey, short distances, other devices and unsigned photos", () => {
    const at = (o: Partial<TrustOther>) => codes(run({ asset: signed(), others: [other({ device: "dev1", ...far, taken_at: "2026-09-12T12:00:00Z", ...o })] }))
    expect(at({})).not.toContain("IMPOSSIBLE_TRAVEL") // 84 km in 2 h = 42 km/h
    expect(at({ lat: site.lat + 0.03, taken_at: "2026-09-12T10:01:00Z" })).not.toContain("IMPOSSIBLE_TRAVEL") // ~3 km: under the 5 km floor
    expect(at({ device: "dev2", taken_at: "2026-09-12T10:05:00Z" })).not.toContain("IMPOSSIBLE_TRAVEL")
    expect(codes(run({ asset: asset(), others: [other({ device: "dev1", ...far, taken_at: "2026-09-12T10:05:00Z" })] }))).not.toContain("IMPOSSIBLE_TRAVEL")
  })
  it("two places at the same minute is impossible", () => {
    expect(codes(run({ asset: signed(), others: [other({ device: "dev1", ...far, taken_at: "2026-09-12T10:00:00Z" })] }))).toContain("IMPOSSIBLE_TRAVEL")
  })
})

describe("declared AI-generated", () => {
  it("flags a file that declares generative AI (-40), naming the source", () => {
    const r = run({ provenance: { aiDeclared: true, source: "Adobe Firefly" } })
    expect(codes(r)).toEqual(["AI_GENERATED_DECLARED"])
    expect(r.flags[0].reason).toBe("Flagged for review: this file declares it was made or edited with generative AI (Adobe Firefly).")
    expect(r.score).toBe(60)
  })
  it("no declaration, no flag", () => {
    expect(run({ provenance: { aiDeclared: false, source: null } }).flags).toEqual([])
  })
})

describe("METADATA_MISMATCH (what Cloudinary read from the file)", () => {
  const file = { lat: site.lat, lng: site.lng, takenAt: "2026-09-12T10:00:00.000Z", hasCameraData: true }
  it("agrees with an honest upload: no flag", () => expect(run({ fileMeta: file }).score).toBe(100))
  it("edited GPS: -30 with the distance as evidence", () => {
    const r = run({ fileMeta: { ...file, lat: 19.076, lng: 72.8777 } })
    expect(codes(r)).toEqual(["METADATA_MISMATCH"])
    expect(r.score).toBe(70)
    expect(r.flags[0].reason).toMatch(/^Flagged for review: Cloudinary read this photo's own metadata and the location sent is/)
  })
  it("live captures are not compared (they are signed on the device)", () => {
    expect(codes(run({ asset: asset({ captured_live: true }), fileMeta: { ...file, lat: 0, lng: 0 } }))).toEqual(["CAPTURED_LIVE"])
  })
  it("no file metadata at all: nothing to compare, no flag", () => {
    expect(run({ fileMeta: { lat: null, lng: null, takenAt: null, hasCameraData: false } }).score).toBe(100)
  })
})
