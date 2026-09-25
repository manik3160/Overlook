import { describe, expect, it } from "vitest"
import { parseIso6709, parseMoov, readVideoMeta } from "./mp4meta"

const enc = new TextEncoder()
const be32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
const cat = (...parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length } return out }
const box = (type: string, payload: Uint8Array) => cat(be32(8 + payload.length), type.length === 4 && type.charCodeAt(0) === 0xa9 ? new Uint8Array([0xa9, ...enc.encode(type.slice(1))]) : enc.encode(type), payload)

const MAC_OFFSET = 2_082_844_800
const macSeconds = (iso: string) => Date.parse(iso) / 1000 + MAC_OFFSET
const mvhd = (iso: string) => box("mvhd", cat(new Uint8Array([0, 0, 0, 0]), be32(macSeconds(iso)), be32(macSeconds(iso)), be32(1000), be32(45000), new Uint8Array(80)))
const xyz = (text: string) => box("©xyz", cat(new Uint8Array([0, text.length, 0x15, 0xc7]), enc.encode(text)))
const moov = (iso: string, gps?: string) => box("moov", cat(mvhd(iso), gps ? box("udta", xyz(gps)) : new Uint8Array(0)))
const ftyp = box("ftyp", enc.encode("isom0000"))
const mdat = box("mdat", new Uint8Array(500))

describe("parseIso6709", () => {
  it("parses latitude/longitude with and without altitude", () => {
    expect(parseIso6709("+28.9931+077.0151/")).toEqual({ lat: 28.9931, lng: 77.0151 })
    expect(parseIso6709("-12.5-045.25/")).toEqual({ lat: -12.5, lng: -45.25 })
    expect(parseIso6709("+27.5916+086.5640+8850CRSWGS_84/")).toEqual({ lat: 27.5916, lng: 86.564 })
  })
  it("rejects garbage and out-of-range values", () => {
    expect(parseIso6709("not gps")).toBeNull()
    expect(parseIso6709("+95.0+010.0/")).toBeNull()
  })
})

describe("parseMoov", () => {
  it("reads creation time from mvhd and GPS from udta/©xyz", () => {
    const m = parseMoov(moov("2026-09-10T04:00:00Z", "+28.9931+077.0151/"))
    expect(m.createdAt?.toISOString()).toBe("2026-09-10T04:00:00.000Z")
    expect(m.lat).toBe(28.9931)
    expect(m.lng).toBe(77.0151)
  })
  it("works without GPS", () => {
    const m = parseMoov(moov("2026-09-10T04:00:00Z"))
    expect(m.createdAt).not.toBeNull()
    expect(m.lat).toBeNull()
  })
  it("ignores implausible creation times (0, or before 2000)", () => {
    expect(parseMoov(box("moov", box("mvhd", cat(new Uint8Array([0, 0, 0, 0]), be32(0), be32(0), be32(1000), be32(1), new Uint8Array(80)))))!.createdAt).toBeNull()
    expect(parseMoov(moov("1995-01-01T00:00:00Z")).createdAt).toBeNull()
  })
})

// meta (mdta style, modern iPhone): keys + ilst indexed into keys; each item wraps a `data` box
const dataBox = (value: string) => box("data", cat(be32(1), be32(0), enc.encode(value)))
const metaMdta = (pairs: [string, string][]) => box("meta", cat(
  new Uint8Array([0, 0, 0, 0]),
  box("keys", cat(be32(0), be32(pairs.length), ...pairs.map(([k]) => cat(be32(8 + k.length), enc.encode("mdta"), enc.encode(k))))),
  box("ilst", cat(...pairs.map(([, v], i) => cat(be32(8 + dataBox(v).length), be32(i + 1), dataBox(v))))),
))
// meta (mdir style): ilst items are named by four-character codes such as ©xyz
const metaMdir = (text: string) => box("meta", cat(new Uint8Array([0, 0, 0, 0]), box("ilst", box("\u00a9xyz", dataBox(text)))))

describe("parseMoov: meta boxes", () => {
  it("reads iPhone-style location and the time-zone-aware creation date from meta > keys/ilst", () => {
    const m = parseMoov(box("moov", cat(mvhd("2026-09-10T04:00:00Z"), metaMdta([["com.apple.quicktime.location.ISO6709", "+28.9931+077.0151+210.000/"], ["com.apple.quicktime.creationdate", "2026-09-10T09:30:00+0530"]]))))
    expect(m.lat).toBe(28.9931)
    expect(m.lng).toBe(77.0151)
    expect(m.createdAt?.toISOString()).toBe("2026-09-10T04:00:00.000Z") // 09:30 at +05:30 == 04:00Z
  })
  it("also finds meta nested in udta, and ©xyz inside an mdir-style ilst", () => {
    const m = parseMoov(box("moov", cat(mvhd("2026-09-10T04:00:00Z"), box("udta", metaMdir("+28.9931+077.0151/")))))
    expect(m.lat).toBe(28.9931)
  })
  it("ignores unrelated keys", () => {
    const m = parseMoov(box("moov", cat(mvhd("2026-09-10T04:00:00Z"), metaMdta([["com.apple.quicktime.model", "iPhone 15"]]))))
    expect(m.lat).toBeNull()
    expect(m.createdAt).not.toBeNull()
  })
})

describe("readVideoMeta", () => {
  it("finds moov when it comes BEFORE the media data", async () => {
    const m = await readVideoMeta(new Blob([cat(ftyp, moov("2026-09-10T04:00:00Z", "+28.9931+077.0151/"), mdat)]))
    expect(m.lat).toBe(28.9931)
    expect(m.createdAt?.getUTCFullYear()).toBe(2026)
  })
  it("finds moov when it comes AFTER the media data (common for camera files)", async () => {
    const m = await readVideoMeta(new Blob([cat(ftyp, mdat, moov("2026-09-10T04:00:00Z", "+28.9931+077.0151/"))]))
    expect(m.lng).toBe(77.0151)
  })
  it("returns empty metadata for non-video or truncated files, never throws", async () => {
    expect(await readVideoMeta(new Blob([enc.encode("this is not a video file at all")]))).toEqual({ createdAt: null, lat: null, lng: null })
    expect(await readVideoMeta(new Blob([]))).toEqual({ createdAt: null, lat: null, lng: null })
    expect(await readVideoMeta(new Blob([cat(ftyp, moov("2026-09-10T04:00:00Z").subarray(0, 20))]))).toEqual({ createdAt: null, lat: null, lng: null })
  })
})
