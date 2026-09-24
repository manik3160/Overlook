import exifr from "exifr"

export type ExifData = {
  lat: number | null
  lng: number | null
  takenAt: string | null
  hasExif: boolean
}

export const NO_EXIF: ExifData = { lat: null, lng: null, takenAt: null, hasExif: false }

// Runs in the browser before upload. Videos and unreadable files just return NO_EXIF.
export async function readExif(file: File): Promise<ExifData> {
  try {
    // gps() computes decimal lat/lng; latitude/longitude are not raw tags, so `pick` would drop them.
    const [gps, tags] = await Promise.all([
      exifr.gps(file).catch(() => undefined),
      exifr.parse(file, { pick: ["DateTimeOriginal"] }).catch(() => undefined),
    ])
    const lat = typeof gps?.latitude === "number" ? gps.latitude : null
    const lng = typeof gps?.longitude === "number" ? gps.longitude : null
    const taken = tags?.DateTimeOriginal instanceof Date ? tags.DateTimeOriginal : null
    return {
      lat,
      lng,
      takenAt: taken && !Number.isNaN(taken.getTime()) ? taken.toISOString() : null,
      hasExif: lat !== null || taken !== null,
    }
  } catch {
    return NO_EXIF
  }
}
