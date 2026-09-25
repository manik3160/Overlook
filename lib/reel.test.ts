import { describe, expect, it } from "vitest"
import { MAX_EXTRA_PHOTOS, planReel, reelSeconds, reelUrl, slideUrl, type ReelPhoto } from "./reel"

const photo = (id: string, peopleWorking = 0, trust = 100, takenAt: string | null = "2026-06-12T05:00:00Z"): ReelPhoto => ({ publicId: id, takenAt, peopleWorking, trust })
const base = { projectName: "Lake cleanup", verifiedCount: 5, headline: "Garbage visible: 4 of 5 before, 0 of 3 after", formatDay: (iso: string) => iso.slice(0, 10) }

describe("planReel", () => {
  it("is empty when there is no verified photo", () => {
    expect(planReel({ ...base, pair: null, photos: [] })).toEqual([])
  })

  it("orders title, before, extras, after, end, and never repeats the pair photos", () => {
    const before = photo("b"), after = photo("a")
    const slides = planReel({ ...base, pair: { before, after }, photos: [before, after, photo("x")] })
    expect(slides.map((s) => s.kind)).toEqual(["title", "photo", "photo", "photo", "end"])
    expect(slides.filter((s) => s.kind === "photo").map((s) => s.kind === "photo" && s.publicId)).toEqual(["b", "x", "a"])
  })

  it("labels the pair with dates and shows extras in date order", () => {
    const slides = planReel({
      ...base,
      pair: { before: photo("b"), after: photo("a", 0, 100, null) },
      photos: [photo("late", 6, 100, "2026-06-20T05:00:00Z"), photo("early", 0, 100, "2026-06-14T05:00:00Z")],
    })
    const labels = slides.flatMap((s) => (s.kind === "photo" ? [`${s.publicId}:${s.label}`] : []))
    expect(labels).toEqual(["b:BEFORE · 2026-06-12", "early:VERIFIED · 2026-06-14", "late:ON SITE · 2026-06-20", "a:AFTER"])
  })

  it("picks people at work first when there are more photos than room", () => {
    const photos = [...Array.from({ length: 6 }, (_, i) => photo(`quiet${i}`, 0)), photo("busy", 5)]
    const ids = planReel({ ...base, pair: null, photos }).flatMap((s) => (s.kind === "photo" ? [s.publicId] : []))
    expect(ids).toContain("busy")
  })

  it(`caps extra photos at ${MAX_EXTRA_PHOTOS}`, () => {
    const photos = Array.from({ length: 9 }, (_, i) => photo(`p${i}`))
    expect(planReel({ ...base, pair: null, photos }).filter((s) => s.kind === "photo")).toHaveLength(MAX_EXTRA_PHOTOS)
  })

  it("works without a pair (title and end use the best photo)", () => {
    const slides = planReel({ ...base, pair: null, photos: [photo("only", 2)] })
    expect(slides[0]).toMatchObject({ kind: "title", background: "only", subtitle: "5 verified photos" })
    expect(slides.at(-1)).toMatchObject({ kind: "end", background: "only" })
  })
})

describe("URLs", () => {
  it("pixelates faces before anything else on every slide", () => {
    for (const slide of planReel({ ...base, pair: { before: photo("f/b"), after: photo("f/a") }, photos: [photo("f/x", 3)] })) {
      expect(slideUrl("demo", slide)).toMatch(/^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/e_pixelate_faces\//)
    }
  })

  it("escapes commas in burned-in text", () => {
    const end = planReel({ ...base, pair: null, photos: [photo("x")] }).at(-1)!
    expect(slideUrl("demo", end)).toContain("before%252C%200%20of%203")
  })

  it("splices slides in order after the base clip, with crossfades", () => {
    const url = reelUrl("demo", ["overlook/reels/p/1-0", "overlook/reels/p/1-1"], { download: "reel" })
    expect(url).toBe(
      "https://res.cloudinary.com/demo/video/upload/fl_attachment:reel/du_1/" +
        "fl_splice:transition_(name_fade;du_1),l_overlook:reels:p:1-0,c_fill,w_1080,h_1080,du_3/fl_layer_apply/" +
        "fl_splice:transition_(name_fade;du_1),l_overlook:reels:p:1-1,c_fill,w_1080,h_1080,du_3/fl_layer_apply/overlook/reel-base.mp4",
    )
  })

  it("reel length subtracts one crossfade per slide", () => {
    expect(reelSeconds(0)).toBe(0)
    expect(reelSeconds(2)).toBe(5) // 1 s lead + 2 x 3 s - 2 x 1 s fade
  })
})
