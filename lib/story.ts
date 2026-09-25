// Campaign headline, story numbers, best pair, and the narrative grounding check. PURE.
// Everything here is computed from VERIFIED evidence only (trust >= 80 or approved).
import type { Scorecard } from "./signals"

export type Bilingual = { en: string; hi: string }
export type Delta = { key: string; label: Bilingual; before: number; after: number; improvement: number } // percentages

// metric key -> labels and whether a LOWER share is the good direction
const METRIC_TEXT: Record<string, { label: Bilingual; lowerIsBetter?: boolean }> = {
  garbage_visible: { label: { en: "Garbage visible", hi: "कचरा दिखने वाली फोटो" }, lowerIsBetter: true },
  vegetation_dense: { label: { en: "Dense greenery", hi: "घनी हरियाली" } },
  water_present: { label: { en: "Water present", hi: "पानी की उपलब्धता" } },
  structure_complete: { label: { en: "Completed structures", hi: "पूरे बने ढांचे" } },
  people_working: { label: { en: "Community at work", hi: "काम में जुटे लोग" } },
  safety_gear: { label: { en: "Safety gear in use", hi: "सुरक्षा उपकरणों का उपयोग" } },
}

const pct = (c: { hits: number; total: number }) => Math.round((c.hits / c.total) * 100)

// Metrics that improved between the before and after sets, biggest improvement first.
export function improvements(sc: Scorecard): Delta[] {
  const out: Delta[] = []
  for (const r of sc.rows) {
    const t = METRIC_TEXT[r.key]
    if (!t || !r.before || !r.after || r.before.total === 0 || r.after.total === 0) continue
    const before = pct(r.before), after = pct(r.after)
    const improvement = t.lowerIsBetter ? before - after : after - before
    if (improvement > 0) out.push({ key: r.key, label: t.label, before, after, improvement })
  }
  return out.sort((a, b) => b.improvement - a.improvement)
}

export function headline(sc: Scorecard, verifiedPhotos: number, projectName: string): Bilingual {
  const best = improvements(sc)[0]
  if (best) return { en: `${best.label.en}: ${best.before}% to ${best.after}%`, hi: `${best.label.hi}: ${best.before}% से ${best.after}%` }
  // Hindi text is rendered in Noto Sans Devanagari, which has NO Latin glyphs: keep the project name out of it.
  return { en: `${verifiedPhotos} verified photos from ${projectName}`, hi: `${verifiedPhotos} सत्यापित फोटो` }
}

export const subline = (projectName: string, verifiedPhotos: number): Bilingual => ({
  en: `${projectName} | ${verifiedPhotos} verified photos | Overlook`,
  hi: `${verifiedPhotos} सत्यापित फोटो`,
})

// Latin-script footer for cards whose main text is Hindi (drawn in Arial, not the Devanagari font).
export const footerLine = (projectName: string): string => `${projectName} | Overlook`

// Three numbers for the story page: biggest improvements first, topped up with evidence-quality numbers.
export function topNumbers(sc: Scorecard, verifiedPhotos: number): { label: string; value: string }[] {
  const nums = improvements(sc).slice(0, 3).map((d) => ({ label: d.label.en, value: `${d.before}% to ${d.after}%` }))
  const filler = [
    { label: "Verified photos", value: String(verifiedPhotos) },
    { label: "Evidence coverage", value: sc.verifiedPct === null ? "n/a" : `${sc.verifiedPct}%` },
    { label: "Average trust score", value: sc.avgTrust === null ? "n/a" : String(sc.avgTrust) },
  ]
  return [...nums, ...filler].slice(0, 3)
}

export type PairRef = { beforeId: string; afterId: string; distanceM: number | null }
// Only pairs whose BOTH photos are verified; best = highest weaker-photo trust, then closest.
export function pickBestPair(pairs: PairRef[], verifiedTrust: Map<string, number>): PairRef | null {
  const ok = pairs.filter((p) => verifiedTrust.has(p.beforeId) && verifiedTrust.has(p.afterId))
  const weakest = (p: PairRef) => Math.min(verifiedTrust.get(p.beforeId)!, verifiedTrust.get(p.afterId)!)
  return ok.sort((a, b) => weakest(b) - weakest(a) || (a.distanceM ?? 1e9) - (b.distanceM ?? 1e9))[0] ?? null
}

export type Narrative = { problem: string; action: string; result: string }
// Compare numeric VALUES, not text: "September 1" must match a date written 2026-09-01.
const numbersIn = (text: string) => (text.match(/\d+(?:\.\d+)?/g) ?? []).map((x) => String(parseFloat(x)))

// Guard against invented figures: every number in the narrative must appear in the facts it was given.
export function narrativeGrounded(n: Narrative, factsText: string): boolean {
  const allowed = new Set(numbersIn(factsText))
  return numbersIn(`${n.problem} ${n.action} ${n.result}`).every((x) => allowed.has(x))
}

export type StoryFacts = {
  projectName: string; activity: string | null; description: string | null; startDate: string | null; endDate: string | null
  verifiedPhotos: number; totalPhotos: number; numbers: { label: string; value: string }[]; captions: string[]; pairSummary: string | null
}
export const factsText = (f: StoryFacts): string => JSON.stringify(f)

// Used when the AI is unavailable (quota) or its output fails the grounding check.
export function templateNarrative(f: StoryFacts): Narrative {
  const activity = f.activity ? f.activity.replace(/_/g, " ") : "field"
  const when = f.startDate ? ` from ${f.startDate}${f.endDate ? ` to ${f.endDate}` : ""}` : ""
  const nums = f.numbers.map((n) => `${n.label.toLowerCase()}: ${n.value}`).join("; ")
  return {
    problem: f.description ?? `The ${f.projectName} project set out to improve conditions through a ${activity} effort.`,
    action: `Volunteers carried out a ${activity} activity${when} and documented it with geotagged photos.`,
    result: `${f.verifiedPhotos} of ${f.totalPhotos} photos passed verification. ${nums ? `Results: ${nums}.` : ""}`.trim(),
  }
}
