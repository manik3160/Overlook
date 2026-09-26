import { describe, expect, it } from "vitest"
import { evaluateMilestone, milestonesSchema, releasablePct, templateMilestones, type Milestone, type MilestonePhoto } from "./milestones"

const t = (d: string) => Date.parse(`${d}T06:00:00Z`)
const photo = (id: string, o: Partial<MilestonePhoto> = {}): MilestonePhoto => ({ id, time: t("2026-10-05"), tags: [], trustScore: 100, reviewStatus: "unreviewed", isImage: true, ...o })
const stage = (rule: Partial<Milestone["rule"]> = {}, o: Partial<Milestone> = {}): Milestone => ({ id: "s1", title: "Stage", releasePct: 40, rule: { tags: [], minVerified: 2, from: null, to: null, needPair: false, ...rule }, ...o })

describe("evaluateMilestone", () => {
  it("is ready when enough verified photos match", () => {
    const s = evaluateMilestone(stage(), [photo("a"), photo("b")], [])
    expect(s).toMatchObject({ ready: true, have: 2, missing: [] })
  })
  it("counts only verified, non-rejected images (approved counts even with a low score)", () => {
    const s = evaluateMilestone(stage({ minVerified: 5 }), [photo("ok"), photo("low", { trustScore: 60 }), photo("appr", { trustScore: 40, reviewStatus: "approved" }), photo("rej", { reviewStatus: "rejected" }), photo("vid", { isImage: false })], [])
    expect(s.matchedIds.sort()).toEqual(["appr", "ok"])
    expect(s.missing).toEqual(["3 more verified photos"])
  })
  it("matches any of the tags and says which are missing", () => {
    const s = evaluateMilestone(stage({ tags: ["cleanup_drive", "garbage_present"], minVerified: 3 }), [photo("a", { tags: ["cleanup_drive"] }), photo("b", { tags: ["garbage_present"] }), photo("c", { tags: ["vegetation"] })], [])
    expect(s.have).toBe(2)
    expect(s.missing).toEqual(["1 more verified photo showing cleanup drive or garbage present"])
  })
  it("respects the date window (inclusive) and ignores undated photos for dated stages", () => {
    const s = evaluateMilestone(stage({ from: "2026-10-01", to: "2026-10-10", minVerified: 3 }), [photo("in"), photo("edge", { time: Date.parse("2026-10-10T23:00:00Z") }), photo("late", { time: t("2026-10-11") }), photo("undated", { time: null })], [])
    expect(s.matchedIds.sort()).toEqual(["edge", "in"])
    expect(s.missing[0]).toBe("1 more verified photo between 2026-10-01 and 2026-10-10")
  })
  it("needPair requires a pair whose AFTER photo matches", () => {
    const m = stage({ needPair: true, minVerified: 1 })
    expect(evaluateMilestone(m, [photo("a")], []).missing).toEqual(["a before/after pair of the same spot"])
    expect(evaluateMilestone(m, [photo("a")], [{ beforeId: "a", afterId: "zzz" }]).ready).toBe(false)
    expect(evaluateMilestone(m, [photo("a")], [{ beforeId: "x", afterId: "a" }]).ready).toBe(true)
  })
})

describe("releasablePct", () => {
  it("adds up ready stages only", () => {
    const ready = evaluateMilestone(stage({ minVerified: 1 }, { releasePct: 30 }), [photo("a")], [])
    const notYet = evaluateMilestone(stage({ minVerified: 9 }, { id: "s2", releasePct: 70 }), [photo("a")], [])
    expect(releasablePct([ready, notYet])).toBe(30)
  })
})

describe("validation", () => {
  it("rejects shares over 100%, duplicate ids and reversed dates", () => {
    expect(milestonesSchema.safeParse([stage({}, { releasePct: 60 }), stage({}, { id: "s2", releasePct: 50 })]).success).toBe(false)
    expect(milestonesSchema.safeParse([stage(), stage()]).success).toBe(false)
    expect(milestonesSchema.safeParse([stage({ from: "2026-10-10", to: "2026-10-01" })]).success).toBe(false)
    expect(milestonesSchema.safeParse([stage()]).success).toBe(true)
  })
  it("the template is valid and adds up to 100%", () => {
    const ms = templateMilestones("cleanup", "2026-09-01", "2026-12-31")
    expect(milestonesSchema.safeParse(ms).success).toBe(true)
    expect(ms.reduce((s, m) => s + m.releasePct, 0)).toBe(100)
    expect(ms.at(-1)!.rule.needPair).toBe(true)
  })
})
