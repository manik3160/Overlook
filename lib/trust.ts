// Evidence Trust Score. PURE: no I/O, so it is easy to test. Wording rule: we say "flagged for
// review", never "fake" or "fraud"; humans decide in /review.
import { haversineM } from "./geo"
import { hammingDistance, NEAR_DUPLICATE_MAX_DISTANCE } from "./phash"

export type TrustFlag = { code: string; severity: "info" | "warning" | "high"; reason: string; evidence: Record<string, unknown> }
export type TrustBand = "Verified" | "Needs review" | "Suspicious"

export type TrustAsset = {
  id: string
  created_at: string
  etag: string | null
  phash: string | null
  project_id: string | null
  parent_asset_id: string | null // set for frames extracted from a video
  lat: number | null
  lng: number | null
  taken_at: string | null
  has_exif: boolean
}
export type TrustOther = Pick<TrustAsset, "id" | "created_at" | "etag" | "phash" | "project_id" | "parent_asset_id">
export type TrustProject = {
  center_lat: number | null
  center_lng: number | null
  radius_m: number | null
  start_date: string | null // YYYY-MM-DD
  end_date: string | null
}
export type TrustChecks = { photo_of_screen_or_print: boolean; unrelated_to_field_work: boolean }
export type TrustInput = {
  asset: TrustAsset
  project: TrustProject | null
  others: TrustOther[] // every other asset; only EARLIER uploads count as "the original"
  checks: TrustChecks | null // AI answers, null until analysed
  lowConfidence: boolean
}
export type TrustResult = { score: number; band: TrustBand; flags: TrustFlag[] }

const DAY_MS = 86_400_000
const TIMEFRAME_SLACK_DAYS = 7
export const NO_METADATA_CAP = 60

// One source of truth for the score arithmetic; the UI's audit trace reads these too (DESIGN.md 14.2).
export const TRUST_DEDUCTIONS = {
  DUPLICATE_EXACT: 50,
  DUPLICATE_REUSED: 40,
  PHOTO_OF_PHOTO: 35,
  OUTSIDE_GEOFENCE: 25,
  OUTSIDE_TIMEFRAME: 15,
  IRRELEVANT: 10,
} as const

export function trustBand(score: number): TrustBand {
  return score >= 80 ? "Verified" : score >= 50 ? "Needs review" : "Suspicious"
}

const isEarlier = (o: TrustOther, a: TrustAsset) => o.created_at < a.created_at || (o.created_at === a.created_at && o.id < a.id)

// A frame is never a "copy" of its own video or of its sibling frames: a tripod shot yields near-identical frames.
const sameVideo = (a: TrustAsset, o: TrustOther) => o.id === a.parent_asset_id || o.parent_asset_id === a.id || (a.parent_asset_id !== null && o.parent_asset_id === a.parent_asset_id)

function duplicateFlag(asset: TrustAsset, others: TrustOther[]): { flag: TrustFlag; deduction: number } | null {
  const earlier = others.filter((o) => isEarlier(o, asset) && !sameVideo(asset, o))

  const exact = earlier.find((o) => asset.etag && o.etag === asset.etag)
  if (exact) {
    return {
      deduction: TRUST_DEDUCTIONS.DUPLICATE_EXACT,
      flag: {
        code: "DUPLICATE_EXACT",
        severity: "warning",
        reason: "Flagged for review: this file is byte-for-byte identical to an earlier upload.",
        evidence: { matchAssetId: exact.id, sameProject: exact.project_id === asset.project_id },
      },
    }
  }

  let best: { other: TrustOther; distance: number } | null = null
  for (const o of earlier) {
    const d = hammingDistance(asset.phash, o.phash)
    if (d !== null && d <= NEAR_DUPLICATE_MAX_DISTANCE && (!best || d < best.distance)) best = { other: o, distance: d }
  }
  if (!best) return null
  const differentProject = !!best.other.project_id && best.other.project_id !== asset.project_id
  return {
    deduction: TRUST_DEDUCTIONS.DUPLICATE_REUSED,
    flag: {
      code: "DUPLICATE_REUSED",
      severity: differentProject ? "high" : "warning",
      reason: differentProject
        ? "Flagged for review: this image looks like a re-used copy of an earlier photo from a different project."
        : "Flagged for review: this image looks nearly identical to an earlier photo.",
      evidence: { matchAssetId: best.other.id, hammingDistance: best.distance, differentProject },
    },
  }
}

function timeframeFlag(asset: TrustAsset, project: TrustProject): TrustFlag | null {
  if (!asset.taken_at || (!project.start_date && !project.end_date)) return null
  const taken = new Date(asset.taken_at).getTime()
  const slack = TIMEFRAME_SLACK_DAYS * DAY_MS
  const start = project.start_date ? Date.parse(`${project.start_date}T00:00:00Z`) - slack : -Infinity
  const end = project.end_date ? Date.parse(`${project.end_date}T23:59:59Z`) + slack : Infinity
  if (taken >= start && taken <= end) return null
  return {
    code: "OUTSIDE_TIMEFRAME",
    severity: "warning",
    reason: `Flagged for review: photo time is outside the project dates (${project.start_date ?? "…"} to ${project.end_date ?? "…"}, ±${TIMEFRAME_SLACK_DAYS} days).`,
    evidence: { takenAt: asset.taken_at, start: project.start_date, end: project.end_date },
  }
}

function geofenceFlag(asset: TrustAsset, project: TrustProject): TrustFlag | null {
  if (project.center_lat === null || project.center_lng === null || asset.lat === null || asset.lng === null) return null
  const radius = project.radius_m ?? 500
  const distanceM = Math.round(haversineM({ lat: project.center_lat, lng: project.center_lng }, { lat: asset.lat, lng: asset.lng }))
  if (distanceM <= radius) return null
  return {
    code: "OUTSIDE_GEOFENCE",
    severity: "warning",
    reason: `Flagged for review: photo location is ${distanceM} m from the project center (geofence ${radius} m).`,
    evidence: { distanceM, radiusM: radius },
  }
}

export function computeTrust(input: TrustInput): TrustResult {
  const { asset, project, others, checks, lowConfidence } = input
  const flags: TrustFlag[] = []
  let deduction = 0

  const dup = duplicateFlag(asset, others)
  if (dup) {
    flags.push(dup.flag)
    deduction += dup.deduction
  }
  if (checks?.photo_of_screen_or_print) {
    flags.push({ code: "PHOTO_OF_PHOTO", severity: "high", reason: "Flagged for review: this looks like a photo of a screen or a printed photograph.", evidence: {} })
    deduction += TRUST_DEDUCTIONS.PHOTO_OF_PHOTO
  }
  const geo = project ? geofenceFlag(asset, project) : null
  if (geo) {
    flags.push(geo)
    deduction += TRUST_DEDUCTIONS.OUTSIDE_GEOFENCE
  }
  const time = project ? timeframeFlag(asset, project) : null
  if (time) {
    flags.push(time)
    deduction += TRUST_DEDUCTIONS.OUTSIDE_TIMEFRAME
  }
  if (checks?.unrelated_to_field_work) {
    flags.push({ code: "IRRELEVANT", severity: "warning", reason: "Flagged for review: the image does not appear related to field or community work.", evidence: {} })
    deduction += TRUST_DEDUCTIONS.IRRELEVANT
  }
  if (!asset.has_exif) {
    flags.push({ code: "NO_METADATA", severity: "info", reason: "No location or time metadata: this photo can't be verified on its own (that is not a sign of tampering).", evidence: { cap: NO_METADATA_CAP } })
  }
  if (lowConfidence) {
    flags.push({ code: "LOW_CONFIDENCE", severity: "info", reason: "couldn't confidently classify this image; needs a human look", evidence: {} })
  }

  let score = 100 - deduction
  if (!asset.has_exif) score = Math.min(score, NO_METADATA_CAP)
  score = Math.max(0, Math.min(100, score))
  return { score, band: trustBand(score), flags }
}
