// Pay-on-Proof. PURE: a payment stage ("40% on completion") is READY TO RELEASE only when verified evidence
// meeting its rule exists. Funders pay because this protects their money at every tranche.
// Wording rule: "ready to release" / "not ready yet", never "fraud"; a human still releases the money.
import { z } from "zod"
import { VERIFIED_SCORE } from "./signals"

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const milestoneSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(1).max(80),
  releasePct: z.number().int().min(1).max(100),
  rule: z.object({
    tags: z.array(z.string().max(40)).max(12), // any of these tags; empty = any photo
    minVerified: z.number().int().min(1).max(10_000),
    from: day.nullable(),
    to: day.nullable(),
    needPair: z.boolean(), // also needs a before/after pair among the matching photos
  }),
})
export const milestonesSchema = z
  .array(milestoneSchema)
  .max(10)
  .refine((ms) => ms.reduce((s, m) => s + m.releasePct, 0) <= 100, "Release shares add up to more than 100%")
  .refine((ms) => new Set(ms.map((m) => m.id)).size === ms.length, "Stage ids must be unique")
  .refine((ms) => ms.every((m) => !m.rule.from || !m.rule.to || m.rule.from <= m.rule.to), "A stage ends before it starts")
export type Milestone = z.infer<typeof milestoneSchema>

export type MilestonePhoto = { id: string; time: number | null; tags: string[]; trustScore: number | null; reviewStatus: string; isImage: boolean }
export type MilestonePair = { beforeId: string; afterId: string }
export type MilestoneStatus = {
  milestone: Milestone
  ready: boolean
  have: number // matching verified photos
  matchedIds: string[]
  hasPair: boolean
  missing: string[] // what is still needed, in plain words
}

const verified = (p: MilestonePhoto) => p.reviewStatus !== "rejected" && (p.reviewStatus === "approved" || (p.trustScore ?? -1) >= VERIFIED_SCORE)
const inWindow = (t: number | null, from: string | null, to: string | null) => {
  if (!from && !to) return true
  if (t === null) return false // undated photos cannot prove a dated stage
  return (!from || t >= Date.parse(`${from}T00:00:00Z`)) && (!to || t <= Date.parse(`${to}T23:59:59Z`))
}
const tagText = (tags: string[]) => (tags.length ? ` showing ${tags.map((t) => t.replaceAll("_", " ")).join(" or ")}` : "")
const windowText = (from: string | null, to: string | null) => (from && to ? ` between ${from} and ${to}` : from ? ` from ${from}` : to ? ` up to ${to}` : "")

export function evaluateMilestone(m: Milestone, photos: MilestonePhoto[], pairs: MilestonePair[]): MilestoneStatus {
  const { tags, minVerified, from, to, needPair } = m.rule
  const matched = photos.filter((p) => p.isImage && verified(p) && inWindow(p.time, from, to) && (tags.length === 0 || tags.some((t) => p.tags.includes(t))))
  const ids = new Set(matched.map((p) => p.id))
  const hasPair = pairs.some((x) => ids.has(x.afterId))
  const missing: string[] = []
  if (matched.length < minVerified) missing.push(`${minVerified - matched.length} more verified photo${minVerified - matched.length === 1 ? "" : "s"}${tagText(tags)}${windowText(from, to)}`)
  if (needPair && !hasPair) missing.push("a before/after pair of the same spot")
  return { milestone: m, ready: missing.length === 0, have: matched.length, matchedIds: matched.map((p) => p.id), hasPair, missing }
}

export const evaluateAll = (ms: Milestone[], photos: MilestonePhoto[], pairs: MilestonePair[]) => ms.map((m) => evaluateMilestone(m, photos, pairs))
export const releasablePct = (statuses: MilestoneStatus[]) => statuses.filter((s) => s.ready).reduce((sum, s) => sum + s.milestone.releasePct, 0)

// A sensible starting point per activity: start / progress / completion. Dates come from the project.
export function templateMilestones(activity: string | null, start: string | null, end: string | null): Milestone[] {
  const tags: Record<string, [string[], string[]]> = {
    cleanup: [["garbage_present"], ["cleanup_drive"]],
    plantation: [["tree_plantation"], ["vegetation"]],
    pond_restoration: [["water_body"], ["check_dam", "water_body"]],
    construction: [["construction_in_progress"], ["construction_complete"]],
  }
  const [startTags, endTags] = tags[activity ?? ""] ?? [[], []]
  return [
    { id: "start", title: "Work started on site", releasePct: 30, rule: { tags: startTags, minVerified: 3, from: start, to: null, needPair: false } },
    { id: "progress", title: "Work in progress", releasePct: 40, rule: { tags: [], minVerified: 10, from: start, to: end, needPair: false } },
    { id: "done", title: "Completed, with before/after proof", releasePct: 30, rule: { tags: endTags, minVerified: 3, from: null, to: null, needPair: true } },
  ]
}
