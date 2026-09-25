// Impact scorecard math. PURE. Signals come from the AI analysis (one Gemini call per photo).
// "Before" and "after" sets are split at the largest time gap of >= 3 days; every number in the
// scorecard can be traced back to its photos with photosFor(), which uses the same predicates.
export type Signals = {
  people_working?: number; water_present?: boolean; garbage_visible?: boolean
  vegetation?: "none" | "sparse" | "dense"; structure_stage?: "none" | "in_progress" | "complete"; safety_gear?: boolean
}
export type ScoreAsset = {
  id: string
  time: number | null // photo time (epoch ms); null when the photo has no time metadata
  status: string
  signals: Signals | null
  trust_score: number | null
  review_status: string
  outsideTimeframe?: boolean // flagged OUTSIDE_TIMEFRAME: never used to decide where "before" ends and "after" begins
}
export type MetricKey = "garbage_visible" | "vegetation_dense" | "water_present" | "structure_complete" | "people_working" | "safety_gear"
export type PhaseSet = "before" | "after" | "all"
export type Metric = { key: MetricKey; label: string; test: (s: Signals) => boolean }

export const METRICS: Metric[] = [
  { key: "garbage_visible", label: "Garbage visible", test: (s) => s.garbage_visible === true },
  { key: "vegetation_dense", label: "Dense vegetation", test: (s) => s.vegetation === "dense" },
  { key: "water_present", label: "Water present", test: (s) => s.water_present === true },
  { key: "structure_complete", label: "Completed structure", test: (s) => s.structure_stage === "complete" },
  { key: "people_working", label: "People working", test: (s) => (s.people_working ?? 0) > 0 },
  { key: "safety_gear", label: "Safety gear visible", test: (s) => s.safety_gear === true },
]

const DAY_MS = 86_400_000
export const MIN_PHASE_GAP_DAYS = 3
export const VERIFIED_SCORE = 80

export const isAnalyzed = (a: ScoreAsset): boolean => a.status === "done" && !!a.signals && "garbage_visible" in a.signals

export type Phases = { before: Set<string>; after: Set<string>; gapDays: number; beforeEnd: number; afterStart: number }

// Split timed photos at the biggest gap between consecutive photos; null when no gap is >= minGapDays.
export function splitPhases(assets: ScoreAsset[], minGapDays = MIN_PHASE_GAP_DAYS): Phases | null {
  // A photo already flagged as outside the project's dates must not define the phases (it would become a one-photo "before").
  const timed = assets.filter((a) => a.time !== null && !a.outsideTimeframe).sort((x, y) => x.time! - y.time!)
  let cut = -1, widest = 0
  for (let i = 1; i < timed.length; i++) {
    const gap = timed[i].time! - timed[i - 1].time!
    if (gap > widest) { widest = gap; cut = i }
  }
  if (cut < 0 || widest < minGapDays * DAY_MS) return null
  return {
    before: new Set(timed.slice(0, cut).map((a) => a.id)),
    after: new Set(timed.slice(cut).map((a) => a.id)),
    gapDays: Math.floor(widest / DAY_MS),
    beforeEnd: timed[cut - 1].time!,
    afterStart: timed[cut].time!,
  }
}

const inSet = (a: ScoreAsset, set: PhaseSet, ph: Phases | null) => set === "all" || (ph !== null && (set === "before" ? ph.before : ph.after).has(a.id))

// The photos behind a number: part "total" = analysed photos in the set, "hits" = those where the metric is true.
export function photosFor(assets: ScoreAsset[], key: MetricKey, set: PhaseSet, part: "hits" | "total"): string[] {
  const metric = METRICS.find((m) => m.key === key)!
  const ph = splitPhases(assets)
  return assets.filter((a) => isAnalyzed(a) && inSet(a, set, ph) && (part === "total" || metric.test(a.signals!))).map((a) => a.id)
}

export type Cell = { hits: number; total: number }
export type Scorecard = {
  photos: number; analyzed: number; avgTrust: number | null; verifiedPct: number | null; flaggedOrUnscored: number
  phases: { gapDays: number; beforeCount: number; afterCount: number; beforeEnd: number; afterStart: number } | null
  rows: { key: MetricKey; label: string; before: Cell | null; after: Cell | null; all: Cell }[]
}

export const isVerified = (a: ScoreAsset) => a.review_status === "approved" || (a.trust_score ?? -1) >= VERIFIED_SCORE

// `assets` must already exclude rejected photos.
export function computeScorecard(assets: ScoreAsset[]): Scorecard {
  const ph = splitPhases(assets)
  const cell = (key: MetricKey, set: PhaseSet): Cell => ({ hits: photosFor(assets, key, set, "hits").length, total: photosFor(assets, key, set, "total").length })
  const scored = assets.filter((a) => a.trust_score !== null)
  return {
    photos: assets.length,
    analyzed: assets.filter(isAnalyzed).length,
    avgTrust: scored.length ? Math.round(scored.reduce((s, a) => s + a.trust_score!, 0) / scored.length) : null,
    verifiedPct: assets.length ? Math.round((assets.filter(isVerified).length / assets.length) * 100) : null,
    flaggedOrUnscored: assets.filter((a) => !isVerified(a)).length,
    phases: ph && { gapDays: ph.gapDays, beforeCount: ph.before.size, afterCount: ph.after.size, beforeEnd: ph.beforeEnd, afterStart: ph.afterStart },
    rows: METRICS.map((m) => ({ key: m.key, label: m.label, before: ph ? cell(m.key, "before") : null, after: ph ? cell(m.key, "after") : null, all: cell(m.key, "all") })),
  }
}
