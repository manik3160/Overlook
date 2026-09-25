// Pure geo helpers: distance and greedy clustering for auto project suggestions. No dependencies.
export type LatLng = { lat: number; lng: number }
export type GeoPoint = LatLng & { id: string; time: number } // time = epoch ms
export type Cluster = { ids: string[]; lat: number; lng: number; start: number; end: number; radiusM: number }
export type ClusterOptions = { maxDistM?: number; maxGapDays?: number; minSize?: number }

const EARTH_RADIUS_M = 6_371_000
const DAY_MS = 86_400_000
const toRad = (deg: number) => (deg * Math.PI) / 180

export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

type Working = { pts: GeoPoint[]; lat: number; lng: number; start: number; end: number }

// Greedy, time-ordered: a point joins the first cluster whose centroid is within maxDistM and whose
// time span is within maxGapDays of the point. No DBSCAN library needed at this scale.
export function clusterPoints(points: GeoPoint[], opts: ClusterOptions = {}): Cluster[] {
  const { maxDistM = 500, maxGapDays = 60, minSize = 3 } = opts
  const clusters: Working[] = []

  for (const p of [...points].sort((a, b) => a.time - b.time)) {
    const home = clusters.find((c) => {
      const gapMs = p.time < c.start ? c.start - p.time : Math.max(0, p.time - c.end)
      return gapMs <= maxGapDays * DAY_MS && haversineM(p, c) <= maxDistM
    })
    if (!home) {
      clusters.push({ pts: [p], lat: p.lat, lng: p.lng, start: p.time, end: p.time })
      continue
    }
    home.pts.push(p)
    const n = home.pts.length
    home.lat += (p.lat - home.lat) / n
    home.lng += (p.lng - home.lng) / n
    home.start = Math.min(home.start, p.time)
    home.end = Math.max(home.end, p.time)
  }

  return clusters
    .filter((c) => c.pts.length >= minSize)
    .map((c) => {
      const farthest = Math.max(...c.pts.map((p) => haversineM(p, c)))
      return {
        ids: c.pts.map((p) => p.id),
        lat: c.lat,
        lng: c.lng,
        start: c.start,
        end: c.end,
        radiusM: Math.max(200, Math.ceil((farthest + 50) / 50) * 50), // suggested geofence
      }
    })
    .sort((a, b) => b.ids.length - a.ids.length)
}
