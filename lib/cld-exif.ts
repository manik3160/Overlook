// What Cloudinary reads from a stored photo's own metadata (Admin API `image_metadata: true`), and whether it agrees
// with the location/time the browser sent with the upload. PURE (tested with real Cloudinary strings).
import { haversineM } from "./geo"

export type FileMeta = { lat: number | null; lng: number | null; takenAt: string | null; hasCameraData: boolean }
export const EMPTY_FILE_META: FileMeta = { lat: null, lng: null, takenAt: null, hasCameraData: false }

// "28 deg 36' 50.04\" N" -> 28.6139 (S and W are negative).
export function parseDms(s: string | undefined): number | null {
  if (!s) return null
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*deg\s*(\d+(?:\.\d+)?)'\s*(\d+(?:\.\d+)?)"\s*([NSEW])?/i)
  if (!m) return null
  const v = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600
  return /[SW]/i.test(m[4] ?? "") ? -v : v
}

// "2026:09:20 10:15:30" + "+05:30" -> ISO. No offset in the file: IST, the app's zone (field work is in India).
export function parseExifDate(s: string | undefined, offset: string | undefined, fallbackOffset = "+05:30"): string | null {
  const m = s?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  const off = offset && /^[+-]\d{2}:\d{2}$/.test(offset) ? offset : fallbackOffset
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${off}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function parseCloudinaryMetadata(m: Record<string, unknown> | null | undefined): FileMeta {
  if (!m) return EMPTY_FILE_META
  const str = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : undefined)
  const lat = parseDms(str("GPSLatitude")), lng = parseDms(str("GPSLongitude"))
  const takenAt = parseExifDate(str("DateTimeOriginal"), str("OffsetTimeOriginal"))
  return {
    lat: lat !== null && lng !== null ? lat : null,
    lng: lat !== null && lng !== null ? lng : null,
    takenAt,
    hasCameraData: !!(str("DateTimeOriginal") || str("Make") || str("Model")),
  }
}

export const GPS_TOLERANCE_M = 200
const MIN = 60_000
const TIME_TOLERANCE_MIN = 2

export type Sent = { lat: number | null; lng: number | null; taken_at: string | null }
export type Mismatch = { reasons: string[]; evidence: Record<string, unknown> }

// Compares what was SENT with the upload to what is IN the stored file. Only flags real disagreements:
// - GPS in both, more than 200 m apart;
// - time in both, not explained by a timezone (whole or half hours) and more than 2 min off;
// - GPS sent, but the file has camera metadata and no GPS (location added to a photo that never had one).
// Files with no metadata at all (e.g. re-encoded downloads, WhatsApp) are never flagged here.
export function metadataMismatch(sent: Sent, file: FileMeta): Mismatch | null {
  const reasons: string[] = []
  const evidence: Record<string, unknown> = {}
  if (sent.lat !== null && sent.lng !== null && file.lat !== null && file.lng !== null) {
    const d = Math.round(haversineM({ lat: sent.lat, lng: sent.lng }, { lat: file.lat, lng: file.lng }))
    if (d > GPS_TOLERANCE_M) {
      reasons.push(`the location sent is ${d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${d} m`} from the one in the file`)
      Object.assign(evidence, { distanceM: d, fileLat: file.lat, fileLng: file.lng })
    }
  } else if (sent.lat !== null && sent.lng !== null && file.lat === null && file.hasCameraData) {
    reasons.push("a location was sent but the file's camera data has none")
    evidence.fileHasGps = false
  }
  if (sent.taken_at && file.takenAt) {
    const delta = Date.parse(sent.taken_at) - Date.parse(file.takenAt)
    const offTz = ((delta % (30 * MIN)) + 45 * MIN) % (30 * MIN) - 15 * MIN // distance to the nearest half hour
    if (Math.abs(delta) > 26 * 60 * MIN || Math.abs(offTz) > TIME_TOLERANCE_MIN * MIN) {
      reasons.push("the time sent does not match the time in the file")
      Object.assign(evidence, { fileTakenAt: file.takenAt, minutesOff: Math.round(delta / MIN) })
    }
  }
  return reasons.length ? { reasons, evidence } : null
}
