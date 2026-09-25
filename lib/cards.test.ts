import { describe, expect, it } from "vitest"
import { cardUrl, escapeOverlayText, HINDI_FONT } from "./cards"

const base = { cloud: "democloud", hero: { publicId: "evidence/inbox/after1" }, before: { publicId: "evidence/inbox/before1" }, headline: "Garbage visible: 100% to 0%", subline: "Test, Drive | Overlook" }

describe("escapeOverlayText", () => {
  it("double-encodes comma, slash and percent as the Cloudinary docs require", () => {
    expect(escapeOverlayText("a,b")).toBe("a%252Cb")
    expect(escapeOverlayText("a/b")).toBe("a%252Fb")
    expect(escapeOverlayText("100%")).toBe("100%2525")
  })
  it("single-encodes everything else, including Devanagari", () => {
    expect(escapeOverlayText("a b")).toBe("a%20b")
    expect(escapeOverlayText("से")).toBe("%E0%A4%B8%E0%A5%87")
  })
})

describe("cardUrl", () => {
  it("instagram: 1080x1080, before west / after east, faces pixelated on every photo layer", () => {
    const u = cardUrl({ ...base, kind: "instagram" })
    expect(u).toContain("c_fill,w_1080,h_1080")
    expect(u).toContain("l_evidence:inbox:before1/e_pixelate_faces/c_fill,w_540,h_1080/fl_layer_apply,g_west")
    expect(u).toContain("l_evidence:inbox:after1/e_pixelate_faces/c_fill,w_540,h_1080/fl_layer_apply,g_east")
    expect(u.startsWith("https://res.cloudinary.com/democloud/image/upload/e_pixelate_faces/")).toBe(true)
    expect(u.endsWith("/evidence/inbox/after1.jpg")).toBe(true)
    expect(u.match(/e_pixelate_faces/g)!.length).toBe(3)
  })
  it("story: 1080x1920 with English text in Arial", () => {
    const u = cardUrl({ ...base, kind: "story" })
    expect(u).toContain("c_fill,w_1080,h_1920")
    expect(u).toContain("l_text:Arial_78_bold:")
    expect(u).not.toContain(HINDI_FONT)
  })
  it("hindi story uses the uploaded Devanagari font and the Hindi text", () => {
    const u = cardUrl({ ...base, headline: "कचरा: 100% से 0%", kind: "story_hi" })
    expect(u).toContain(`l_text:${HINDI_FONT}_78:`)
    expect(u).toContain(escapeOverlayText("कचरा: 100% से 0%"))
    expect(u).not.toContain("Arial")
  })
  it("Devanagari-font layers contain no Latin letters (the font has no Latin glyphs; they render as boxes)", () => {
    const u = cardUrl({ ...base, headline: "कचरा: 100% से 0%", subline: "6 सत्यापित फोटो", footer: "Test Drive | Overlook", kind: "story_hi" })
    const noto = [...u.matchAll(/l_text:NotoSansDevanagari-Bold\.ttf_\d+:([^,]*),co_/g)].map((m) => decodeURIComponent(m[1].replace(/%25([0-9A-F]{2})/g, "%$1")))
    expect(noto).toHaveLength(2)
    for (const t of noto) expect(t).not.toMatch(/[A-Za-z]/)
    expect(u).toContain("l_text:Arial_34_bold:") // the Latin footer is its own Arial layer
  })
  it("never leaves an unescaped comma in overlay text (it would break the transformation)", () => {
    const u = cardUrl({ ...base, kind: "story" })
    const text = u.match(/l_text:[^:]+:([^/]*)\/fl_layer_apply/g)!.map((s) => s.split(":").slice(2).join(":").split(",co_")[0])
    for (const t of text) expect(t).not.toMatch(/,/)
  })
  it("download links add a leading fl_attachment component", () => {
    expect(cardUrl({ ...base, kind: "story" }, { download: "overlook-story" })).toContain("/upload/fl_attachment:overlook-story/e_pixelate_faces/")
  })
  it("falls back to a single full-bleed photo when there is no before photo", () => {
    const u = cardUrl({ ...base, before: null, kind: "instagram" })
    expect(u).not.toContain("BEFORE")
    expect(u).toContain("l_text:Arial_56_bold:")
  })
})
