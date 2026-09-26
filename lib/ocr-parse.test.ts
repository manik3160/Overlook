import { describe, expect, it } from "vitest"
import { parseOcr, textMatches } from "./ocr-parse"

// Shape and text exactly as Cloudinary returned them for the plantation signboard photo (b-spacing).
const REAL = { ocr: { adv_ocr: { status: "complete", data: [{ textAnnotations: [{ locale: "mr", description: "प्लॉट नंबर-१\nपध्दत - 4X4\nरांची संख्या-" }, { description: "प्लॉट" }] }] } } }

describe("parseOcr", () => {
  it("reads the whole text block and its language", () => {
    expect(parseOcr(REAL)).toEqual({ text: "प्लॉट नंबर-१\nपध्दत - 4X4\nरांची संख्या-", locale: "mr" })
  })
  it("returns no text for photos without words, failures and odd shapes", () => {
    expect(parseOcr({ ocr: { adv_ocr: { status: "complete", data: [{}] } } })).toEqual({ text: null, locale: null })
    expect(parseOcr({ ocr: { adv_ocr: { status: "failed" } } })).toEqual({ text: null, locale: null })
    expect(parseOcr(null)).toEqual({ text: null, locale: null })
    expect(parseOcr({ ocr: { adv_ocr: { status: "complete", data: [{ textAnnotations: [{ description: " " }] }] } } }).text).toBeNull()
  })
})

describe("textMatches", () => {
  it("finds words in any script, ignoring case", () => {
    const t = parseOcr(REAL)
    expect(textMatches(t, "4x4")).toBe(true)
    expect(textMatches(t, "प्लॉट")).toBe(true)
    expect(textMatches(t, "bridge")).toBe(false)
    expect(textMatches(null, "4x4")).toBe(false)
  })
})
