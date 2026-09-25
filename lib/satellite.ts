// Satellite cross-check (stretch S1). PURE: windows, land-cover shares and the verdict wording.
// Data: Sentinel-2 L2A (10 m) from Microsoft Planetary Computer, public, no account. Precomputed by
// `npm run satellite -- <projectId>` and stored as a hashed 'satellite' report.
// Wording rule: the satellite can only say a change is CONSISTENT with the claim, never prove it, and
// "no visible change" is never a flag (small sites often do not show at 10 m).

export const SATELLITE_SOURCE = "Sentinel-2 L2A (10 m), Microsoft Planetary Computer"
export const WINDOW_DAYS = 60 // after-window starts at the project end date
export const MAX_CLOUD_SHARE = 0.01 // a scene counts as clear when <1% of the site is cloud or shadow
export const BARE_RISE = 0.15 // cleanup: bare ground share must rise by 15 points
export const NDVI_RISE = 0.05 // green activities: mean NDVI must rise by 0.05

// Sentinel-2 scene classification (SCL) codes.
const SCL_VEGETATION = 4
const SCL_BARE = 5
const SCL_CLOUDY = [3, 8, 9, 10] // cloud shadow, cloud medium/high, thin cirrus

export type Window = { from: string; to: string } // YYYY-MM-DD, inclusive
export type SceneSummary = { id: string; date: string; ndvi: number; vegetationShare: number; bareShare: number; cloudShare: number; pixels: number }
export type Verdict = { tone: "consistent" | "no_change"; text: string }

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const yearEarlier = (day: string) => `${Number(day.slice(0, 4)) - 1}${day.slice(4)}`

// "After": the WINDOW_DAYS following the project end. "Before": the same calendar window one year
// earlier, so both scenes are from the same season (vegetation changes a lot between seasons).
export function comparisonWindows(endDate: string): { before: Window; after: Window } {
  const after = { from: endDate, to: addDays(endDate, WINDOW_DAYS) }
  return { before: { from: yearEarlier(after.from), to: yearEarlier(after.to) }, after }
}

// Square around the project centre, half-side = geofence radius. [minLng, minLat, maxLng, maxLat]
export function siteBox(lat: number, lng: number, radiusM: number): [number, number, number, number] {
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))
  const r = (x: number) => Math.round(x * 1e6) / 1e6
  return [r(lng - dLng), r(lat - dLat), r(lng + dLng), r(lat + dLat)]
}

// Share of the site's pixels per SCL class, from a categorical histogram: [[counts], [classes]].
export function sceneShares(histogram: [number[], number[]]): { vegetation: number; bare: number; cloud: number; total: number } {
  const [counts, classes] = histogram
  const total = counts.reduce((a, b) => a + b, 0)
  const share = (codes: number[]) => (total ? classes.reduce((sum, c, i) => sum + (codes.includes(c) ? counts[i] : 0), 0) / total : 0)
  return { vegetation: share([SCL_VEGETATION]), bare: share([SCL_BARE]), cloud: share(SCL_CLOUDY), total }
}

const pct = (x: number) => `${Math.round(x * 100)}%`

export function satelliteVerdict(activity: string | null, before: SceneSummary, after: SceneSummary, formatDay: (iso: string) => string): Verdict {
  const span = `between ${formatDay(before.date)} and ${formatDay(after.date)}`
  if (activity === "cleanup" && after.bareShare - before.bareShare >= BARE_RISE) {
    return { tone: "consistent", text: `Bare ground went from ${pct(before.bareShare)} to ${pct(after.bareShare)} of the site ${span}: consistent with the site being cleared. The satellite cannot tell what caused the change.` }
  }
  if (activity !== "cleanup" && after.ndvi - before.ndvi >= NDVI_RISE) {
    return { tone: "consistent", text: `Vegetation index (NDVI) rose from ${before.ndvi.toFixed(2)} to ${after.ndvi.toFixed(2)} ${span}: consistent with more plant cover. The satellite cannot tell what caused the change.` }
  }
  return { tone: "no_change", text: `No clear change is visible from space ${span}. That is not a flag: at 10 m per pixel, small sites often do not show.` }
}
