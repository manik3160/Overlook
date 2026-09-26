// CSR compliance annex. PURE. Maps a project to a Schedule VII category (Companies Act 2013, s.135) and UN SDGs,
// and summarises its evidence for CSR / BRSR reporting. Category NAMES only: later amendments renumbered the
// items and sources disagree on numerals, so a sealed report never states a possibly wrong item number.
// Plain ASCII on purpose: the PDF uses built-in fonts.
import { z } from "zod"
import { VERIFIED_SCORE } from "./signals"

export const SCHEDULE_VII = [
  "Hunger, poverty, health care, sanitation and safe drinking water",
  "Education, vocational skills and livelihoods",
  "Gender equality, women empowerment and reducing inequality",
  "Environmental sustainability, ecological balance and conservation of natural resources",
  "National heritage, art and culture",
  "Armed forces veterans, war widows and their dependents",
  "Training to promote sports",
  "Contribution to government relief and welfare funds",
  "Research, development and technology incubators",
  "Rural development",
  "Slum area development",
  "Disaster management, relief, rehabilitation and reconstruction",
] as const

export const SDGS: Record<number, string> = {
  1: "No poverty", 2: "Zero hunger", 3: "Good health and well-being", 4: "Quality education", 5: "Gender equality",
  6: "Clean water and sanitation", 7: "Affordable and clean energy", 8: "Decent work and economic growth",
  9: "Industry, innovation and infrastructure", 10: "Reduced inequalities", 11: "Sustainable cities and communities",
  12: "Responsible consumption and production", 13: "Climate action", 14: "Life below water", 15: "Life on land",
  16: "Peace, justice and strong institutions", 17: "Partnerships for the goals",
}

const SUGGEST: Record<string, { category: (typeof SCHEDULE_VII)[number]; sdgs: number[] }> = {
  cleanup: { category: SCHEDULE_VII[3], sdgs: [11, 12, 15] },
  plantation: { category: SCHEDULE_VII[3], sdgs: [13, 15] },
  pond_restoration: { category: SCHEDULE_VII[3], sdgs: [6, 15] },
  construction: { category: SCHEDULE_VII[9], sdgs: [9, 11] },
  health_camp: { category: SCHEDULE_VII[0], sdgs: [3] },
  education: { category: SCHEDULE_VII[1], sdgs: [4] },
}
export const suggestCompliance = (activity: string | null) => SUGGEST[activity ?? ""] ?? { category: SCHEDULE_VII[9], sdgs: [] as number[] }

export const complianceInputSchema = z.object({
  scheduleVii: z.enum(SCHEDULE_VII),
  sdgs: z.array(z.number().int().min(1).max(17)).max(17),
})
export type ComplianceInput = z.infer<typeof complianceInputSchema>

export const COMPLIANCE_NOTE =
  "Prepared to support CSR reporting under the Companies Act 2013 (section 135 and the CSR Rules) and SEBI BRSR disclosures. It documents field evidence and how it was checked. It is not an impact assessment by an independent agency and does not certify compliance."

export type AnnexAsset = { trust_score: number | null; review_status: string; lat: number | null; lng: number | null; taken_at: string | null; flags: { code: string }[] }
export type Annex = {
  schedule_vii: string
  sdgs: { number: number; name: string }[]
  evidence: { photos: number; verified: number; verified_pct: number | null; flagged_for_review: number; not_scored: number; captured_live: number; with_location: number; with_time: number }
  milestones: { title: string; release_pct: number; ready: boolean }[]
  note: string
}

export function buildAnnex(input: ComplianceInput, assets: AnnexAsset[], milestones: Annex["milestones"]): Annex {
  const verified = assets.filter((a) => a.review_status === "approved" || (a.trust_score ?? -1) >= VERIFIED_SCORE).length
  const notScored = assets.filter((a) => a.trust_score === null && a.review_status !== "approved").length
  return {
    schedule_vii: input.scheduleVii,
    sdgs: [...new Set(input.sdgs)].sort((a, b) => a - b).map((n) => ({ number: n, name: SDGS[n] })),
    evidence: {
      photos: assets.length,
      verified,
      verified_pct: assets.length ? Math.round((verified / assets.length) * 100) : null,
      flagged_for_review: assets.length - verified - notScored,
      not_scored: notScored,
      captured_live: assets.filter((a) => a.flags.some((f) => f.code === "CAPTURED_LIVE")).length,
      with_location: assets.filter((a) => a.lat !== null && a.lng !== null).length,
      with_time: assets.filter((a) => a.taken_at !== null).length,
    },
    milestones,
    note: COMPLIANCE_NOTE,
  }
}
