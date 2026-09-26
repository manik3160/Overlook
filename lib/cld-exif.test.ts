import { describe, expect, it } from "vitest"
import { metadataMismatch, parseCloudinaryMetadata, parseDms, parseExifDate, EMPTY_FILE_META } from "./cld-exif"

// Exactly what Cloudinary returned for a generated test photo (image_metadata: true).
const REAL = { Make: "TestCam", Model: "Overlook Test", DateTimeOriginal: "2026:09:20 10:15:30", OffsetTimeOriginal: "+05:30", GPSLatitudeRef: "North", GPSLongitudeRef: "East", GPSLatitude: "28 deg 36' 50.04\" N", GPSLongitude: "77 deg 12' 32.40\" E", Colorspace: "RGB" }

describe("parsing Cloudinary metadata", () => {
  it("reads GPS in degrees/minutes/seconds, south and west negative", () => {
    expect(parseDms("28 deg 36' 50.04\" N")).toBeCloseTo(28.6139, 4)
    expect(parseDms("122 deg 24' 54.00\" W")).toBeCloseTo(-122.415, 3)
    expect(parseDms("33 deg 51' 0.00\" S")).toBeCloseTo(-33.85, 3)
    expect(parseDms("nonsense")).toBeNull()
  })
  it("reads the capture time with its offset, IST when the file has none", () => {
    expect(parseExifDate("2026:09:20 10:15:30", "+05:30")).toBe("2026-09-20T04:45:30.000Z")
    expect(parseExifDate("2026:09:20 10:15:30", undefined)).toBe("2026-09-20T04:45:30.000Z")
    expect(parseExifDate("2026:09:20 10:15:30", "-07:00")).toBe("2026-09-20T17:15:30.000Z")
    expect(parseExifDate("0000:00:00 00:00:00", undefined)).toBeNull()
  })
  it("turns the real response into location + time", () => {
    const m = parseCloudinaryMetadata(REAL)
    expect(m.lat).toBeCloseTo(28.6139, 4)
    expect(m.lng).toBeCloseTo(77.209, 3)
    expect(m.takenAt).toBe("2026-09-20T04:45:30.000Z")
    expect(m.hasCameraData).toBe(true)
  })
  it("treats a stripped file (what the real sample photos look like) as having nothing", () => {
    expect(parseCloudinaryMetadata({ ImageDescription: "default", Colorspace: "RGB", DPI: "0" })).toEqual(EMPTY_FILE_META)
  })
})

describe("metadataMismatch", () => {
  const file = parseCloudinaryMetadata(REAL)
  const honest = { lat: 28.6139, lng: 77.209, taken_at: "2026-09-20T04:45:30.000Z" }
  it("does not flag an honest upload", () => expect(metadataMismatch(honest, file)).toBeNull())
  it("does not flag a browser in another timezone (whole or half hours)", () => {
    expect(metadataMismatch({ ...honest, taken_at: "2026-09-20T10:15:30.000Z" }, file)).toBeNull() // read as UTC
    expect(metadataMismatch({ ...honest, taken_at: "2026-09-20T17:15:30.000Z" }, file)).toBeNull() // read as UTC-7
  })
  it("does not flag files with no metadata, or uploads that sent none", () => {
    expect(metadataMismatch(honest, EMPTY_FILE_META)).toBeNull()
    expect(metadataMismatch({ lat: null, lng: null, taken_at: null }, file)).toBeNull()
  })
  it("flags an edited location", () => {
    const r = metadataMismatch({ ...honest, lat: 19.076, lng: 72.8777 }, file)
    expect(r?.reasons[0]).toMatch(/km from the one in the file/)
    expect(r?.evidence.distanceM).toBeGreaterThan(1_000_000)
  })
  it("tolerates GPS jitter under 200 m", () => expect(metadataMismatch({ ...honest, lat: 28.6149 }, file)).toBeNull())
  it("flags an edited time (not a timezone shift)", () => {
    expect(metadataMismatch({ ...honest, taken_at: "2026-09-20T04:52:30.000Z" }, file)?.reasons).toEqual(["the time sent does not match the time in the file"])
    expect(metadataMismatch({ ...honest, taken_at: "2026-09-25T04:45:30.000Z" }, file)).not.toBeNull()
  })
  it("flags a location added to a photo whose camera data has none", () => {
    const noGps = { ...file, lat: null, lng: null }
    expect(metadataMismatch(honest, noGps)?.reasons[0]).toMatch(/camera data has none/)
  })
})
