// Evidence gaps: what a project is MISSING, and a shot list for the next field visit. PURE (no I/O, `now` is
// passed in), so it is easy to test. Every other tool shows what you have; this tells the field team what to shoot.
import { haversineM, type LatLng } from "./geo"
import { VERIFIED_SCORE } from "./signals"

const DAY_MS = 86_400_000
export const SAME_SPOT_M = 15 // befores closer than this are one spot: one retake covers them
export const QUIET_DAYS = 30 // an ongoing project with no new photo for this long gets a nudge
const GRID = 3 // the geofence square is split 3 x 3 for coverage

export type GapPhoto = {
  id: string
  lat: number | null
  lng: number | null
  time: number | null // photo time (epoch ms)
  tags: string[]
  trustScore: number | null
  reviewStatus: string
  isImage: boolean
  isRetake: boolean // taken with the Ghost Camera against another photo
}
export type GapProject = { center: LatLng | null; radiusM: number; startDate: string | null; endDate: string | null; activityType: string | null }
export type GapInput = { project: GapProject; photos: GapPhoto[]; pairedIds: Set<string>; beforeIds: Set<string> | null; now: number }

export type Gap = { kind: "after_photos" | "coverage" | "activity" | "time" | "review" | "no_location"; action: boolean; text: string }
export type Shot = { key: string; kind: "retake" | "coverage"; title: string; lat: number; lng: number; ghostId: string | null }
export type GapReport = { gaps: Gap[]; shots: Shot[]; checks: number; passed: number }

// What each kind of project should show. Tags come from lib/taxonomy.ts.
export const EXPECTED: Record<string, { tag: string; label: string }[]> = {
  cleanup: [{ tag: "garbage_present", label: "garbage at the site" }, { tag: "cleanup_drive", label: "people cleaning up" }],
  plantation: [{ tag: "tree_plantation", label: "saplings being planted" }, { tag: "vegetation", label: "plants growing" }],
  pond_restoration: [{ tag: "water_body", label: "the water body" }, { tag: "check_dam", label: "the check dam or bund" }],
  construction: [{ tag: "construction_in_progress", label: "work in progress" }, { tag: "construction_complete", label: "the finished structure" }],
  health_camp: [{ tag: "health_camp", label: "the health camp" }, { tag: "community_meeting", label: "the community gathered" }],
  education: [{ tag: "classroom", label: "the classroom in use" }],
}

const DIRS = [["north-west", "north", "north-east"], ["west", "centre", "east"], ["south-west", "south", "south-east"]]
const verified = (p: GapPhoto) => p.reviewStatus === "approved" || (p.trustScore ?? -1) >= VERIFIED_SCORE
const located = (p: GapPhoto): p is GapPhoto & { lat: number; lng: number } => p.lat !== null && p.lng !== null
const endOfDay = (day: string) => Date.parse(`${day}T23:59:59Z`)
const fmtDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

// Centre of cell (row, col) of the GRID x GRID square around the site; row 0 = north, col 0 = west.
function cellCentre(c: LatLng, radiusM: number, row: number, col: number): LatLng {
  const step = (2 * radiusM) / GRID
  const northM = radiusM - step * (row + 0.5)
  const eastM = -radiusM + step * (col + 0.5)
  return { lat: c.lat + northM / 111_320, lng: c.lng + eastM / (111_320 * Math.cos((c.lat * Math.PI) / 180)) }
}
function cellOf(c: LatLng, radiusM: number, p: LatLng): [number, number] | null {
  const northM = (p.lat - c.lat) * 111_320
  const eastM = (p.lng - c.lng) * 111_320 * Math.cos((c.lat * Math.PI) / 180)
  const step = (2 * radiusM) / GRID
  const row = Math.floor((radiusM - northM) / step)
  const col = Math.floor((eastM + radiusM) / step)
  return row >= 0 && row < GRID && col >= 0 && col < GRID ? [row, col] : null
}

export function findGaps({ project, photos, pairedIds, beforeIds, now }: GapInput): GapReport {
  const usable = photos.filter((p) => p.reviewStatus !== "rejected")
  const images = usable.filter((p) => p.isImage)
  const gaps: Gap[] = []
  const shots: Shot[] = []
  let checks = 0

  // 1. Before photos with no after photo: one retake shot per spot, opened in the Ghost Camera.
  checks++
  const befores = images
    .filter(located)
    .filter((p) => !p.isRetake && !pairedIds.has(p.id) && (beforeIds ? beforeIds.has(p.id) : true))
    .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0) || (a.time ?? 0) - (b.time ?? 0))
  const spots: typeof befores = []
  for (const p of befores) if (!spots.some((s) => haversineM(s, p) <= SAME_SPOT_M)) spots.push(p)
  spots.forEach((s, i) => shots.push({ key: `retake:${s.id}`, kind: "retake", title: `Retake spot ${i + 1} from the same angle`, lat: s.lat, lng: s.lng, ghostId: s.id }))
  if (spots.length) gaps.push({ kind: "after_photos", action: true, text: `${spots.length} spot${spots.length === 1 ? " has" : "s have"} a before photo but no after photo.` })

  // 2. Coverage: parts of the site with no geotagged photo at all (only once there is enough to judge).
  const onSite = images.filter(located)
  if (project.center && onSite.length >= 3) {
    checks++
    const hit = new Set(onSite.map((p) => cellOf(project.center!, project.radiusM, p)).filter((c): c is [number, number] => c !== null).map(([r, c]) => `${r},${c}`))
    const empty: string[] = []
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (hit.has(`${r},${c}`)) continue
      empty.push(DIRS[r][c])
      const at = cellCentre(project.center, project.radiusM, r, c)
      shots.push({ key: `coverage:${r},${c}`, kind: "coverage", title: `Cover the ${DIRS[r][c]} part of the site`, lat: at.lat, lng: at.lng, ghostId: null })
    }
    if (empty.length) gaps.push({ kind: "coverage", action: true, text: `No photos from the ${empty.join(", ")} part${empty.length === 1 ? "" : "s"} of the site.` })
  }

  // 3. Expected evidence for this kind of project.
  const expected = EXPECTED[project.activityType ?? ""] ?? []
  if (expected.length) {
    checks++
    const missing = expected.filter((e) => !images.some((p) => verified(p) && p.tags.includes(e.tag)))
    if (missing.length) gaps.push({ kind: "activity", action: true, text: `${missing.length} of ${expected.length} expected activities have no verified photo: ${missing.map((m) => m.label).join(", ")}.` })
  }

  // 4. Time: after photos once the project has ended; a nudge when an ongoing project has gone quiet.
  const times = usable.map((p) => p.time).filter((t): t is number => t !== null)
  const latest = times.length ? Math.max(...times) : null
  if (project.endDate) {
    checks++
    const end = endOfDay(project.endDate)
    if (now > end && !usable.some((p) => p.time !== null && p.time > end)) gaps.push({ kind: "time", action: true, text: `The project ended on ${project.endDate} and there is no photo taken after that date.` })
    else if (now <= end && latest !== null && now - latest > QUIET_DAYS * DAY_MS) gaps.push({ kind: "time", action: true, text: `No new photos for ${Math.floor((now - latest) / DAY_MS)} days (last on ${fmtDay(latest)}).` })
  }

  // 5. Review queue and photos that cannot be placed on the map.
  checks++
  const waiting = usable.filter((p) => p.reviewStatus === "unreviewed" && p.trustScore !== null && p.trustScore < VERIFIED_SCORE).length
  if (waiting) gaps.push({ kind: "review", action: false, text: `${waiting} photo${waiting === 1 ? " is" : "s are"} flagged for review and not counted as verified yet.` })
  checks++
  const noPlace = images.filter((p) => !located(p)).length
  if (noPlace) gaps.push({ kind: "no_location", action: false, text: `${noPlace} photo${noPlace === 1 ? " has" : "s have"} no location, so ${noPlace === 1 ? "it does" : "they do"} not count for coverage or pairing. Use the field camera next time.` })

  const failedChecks = new Set(gaps.map((g) => g.kind)).size
  return { gaps, shots, checks, passed: checks - failedChecks }
}
