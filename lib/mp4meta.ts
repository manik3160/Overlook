// Reads creation time and GPS from an MP4/MOV file WITHOUT any library, so the browser can fill in
// video metadata before upload (exifr only understands photos). PURE parsing + a small async reader.
//   time: moov > mvhd (seconds since 1904-01-01 UTC)
//   GPS : moov > udta > ©xyz (QuickTime/Android), or moov|udta > meta > keys+ilst with the key
//         com.apple.quicktime.location.ISO6709 (modern iPhone). Value is ISO 6709, e.g. "+28.9931+077.0151/".
//   Apple's com.apple.quicktime.creationdate (with a time zone) is preferred over mvhd when present.
export type VideoMeta = { createdAt: Date | null; lat: number | null; lng: number | null }

const EMPTY: VideoMeta = { createdAt: null, lat: null, lng: null }
const MAC_EPOCH_OFFSET_S = 2_082_844_800 // 1904-01-01 -> 1970-01-01
const MAX_MOOV_BYTES = 32 * 1024 * 1024
const CONTAINERS = new Set(["moov", "udta"])

const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0
const type4 = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])

// "+28.9931+077.0151/" or "+27.5916+086.5640+8850CRSWGS_84/" -> { lat, lng }
export function parseIso6709(text: string): { lat: number; lng: number } | null {
  const m = /^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/.exec(text.trim())
  if (!m) return null
  const lat = Number(m[1]), lng = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

function creationTime(mvhd: Uint8Array): Date | null {
  const version = mvhd[0]
  // full box: version(1) flags(3) then creation time (4 bytes, or 8 for version 1)
  const seconds = version === 1 ? u32(mvhd, 4) * 2 ** 32 + u32(mvhd, 8) : u32(mvhd, 4)
  if (!seconds) return null
  const date = new Date((seconds - MAC_EPOCH_OFFSET_S) * 1000)
  return date.getUTCFullYear() >= 2000 && date.getTime() < Date.now() + 86_400_000 ? date : null
}

const LOCATION_KEYS = new Set(["com.apple.quicktime.location.iso6709", "location"])

// Apple writes "2026-09-10T09:30:00+0530"; JS needs "+05:30".
function parseAppleDate(text: string): Date | null {
  const d = new Date(text.trim().replace(/([+-]\d{2})(\d{2})$/, "$1:$2"))
  return Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2000 ? null : d
}

function applyKeyValue(key: string, value: string, out: VideoMeta) {
  const k = key.toLowerCase()
  if (LOCATION_KEYS.has(k) || key === "\u00a9xyz") {
    const gps = parseIso6709(value)
    if (gps) { out.lat = gps.lat; out.lng = gps.lng }
  } else if (k === "com.apple.quicktime.creationdate") {
    out.createdAt = parseAppleDate(value) ?? out.createdAt
  }
}

// `meta` is a full box (4 version/flags bytes). `keys` lists key names; `ilst` items are indexed 1-based
// into it (mdta style) or named by a four-character code such as ©xyz (mdir style).
function walkMeta(bytes: Uint8Array, start: number, end: number, out: VideoMeta) {
  const keys: string[] = []
  const dec = new TextDecoder()
  let o = start
  while (o + 8 <= end) {
    const size = u32(bytes, o), type = type4(bytes, o + 4)
    if (size < 8 || o + size > end) return
    if (type === "keys") {
      let k = o + 16 // header(8) + version/flags(4) + entry count(4)
      while (k + 8 <= o + size) {
        const keySize = u32(bytes, k)
        if (keySize < 8) break
        keys.push(dec.decode(bytes.subarray(k + 8, k + keySize)))
        k += keySize
      }
    } else if (type === "ilst") {
      let i = o + 8
      while (i + 8 <= o + size) {
        const itemSize = u32(bytes, i)
        if (itemSize < 8) break
        const itemType = type4(bytes, i + 4)
        const index = u32(bytes, i + 4)
        const name = itemType === "\u00a9xyz" ? itemType : index >= 1 && index <= keys.length ? keys[index - 1] : ""
        // child `data` box: size(4) 'data'(4) type/flags(4) locale(4) value...
        if (name && i + 24 <= i + itemSize && type4(bytes, i + 12) === "data") applyKeyValue(name, dec.decode(bytes.subarray(i + 24, i + itemSize)), out)
        i += itemSize
      }
    }
    o += size
  }
}

function walk(bytes: Uint8Array, start: number, end: number, out: VideoMeta) {
  let o = start
  while (o + 8 <= end) {
    const size = u32(bytes, o)
    const type = type4(bytes, o + 4)
    if (size < 8 || o + size > end) return
    const body = o + 8
    if (type === "mvhd") out.createdAt = creationTime(bytes.subarray(body, o + size))
    else if (type === "©xyz") {
      // payload: 2-byte text length, 2-byte language, then the ISO 6709 text
      const gps = parseIso6709(new TextDecoder().decode(bytes.subarray(body + 4, o + size)))
      if (gps) { out.lat = gps.lat; out.lng = gps.lng }
    } else if (type === "meta") walkMeta(bytes, body + 4, o + size, out)
    else if (CONTAINERS.has(type)) walk(bytes, body, o + size, out)
    o += size
  }
}

// Parse a complete `moov` box (header included).
export function parseMoov(moov: Uint8Array): VideoMeta {
  const out: VideoMeta = { ...EMPTY }
  walk(moov, 0, moov.length, out)
  return out
}

// Find `moov` among the file's top-level boxes (it may come before or after the media data) and parse it.
export async function readVideoMeta(file: Blob): Promise<VideoMeta> {
  try {
    let offset = 0
    while (offset + 8 <= file.size) {
      const head = new Uint8Array(await file.slice(offset, offset + 16).arrayBuffer())
      let size = u32(head, 0)
      const type = type4(head, 4)
      if (size === 1 && head.length >= 16) size = u32(head, 8) * 2 ** 32 + u32(head, 12) // 64-bit size
      else if (size === 0) size = file.size - offset // box runs to end of file
      if (size < 8) return EMPTY
      if (type === "moov") {
        if (size > MAX_MOOV_BYTES) return EMPTY
        return parseMoov(new Uint8Array(await file.slice(offset, offset + size).arrayBuffer()))
      }
      offset += size
    }
  } catch {
    // unreadable or not an MP4/MOV: no metadata, never an error
  }
  return EMPTY
}
