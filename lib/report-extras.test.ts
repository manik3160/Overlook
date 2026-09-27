import { describe, expect, it } from "vitest"
import { fileCheckLine, pdfWords } from "./report-extras"

describe("fileCheckLine", () => {
  it("states what Cloudinary found inside the file", () => {
    expect(fileCheckLine({ gps: true, time: true, mismatch: false })).toBe("Cloudinary read the file: GPS and time inside, consistent")
    expect(fileCheckLine({ gps: false, time: false, mismatch: false })).toBe("Cloudinary read the file: no location or time inside")
    expect(fileCheckLine({ gps: true, time: true, mismatch: true })).toMatch(/does NOT match/)
    expect(fileCheckLine(undefined)).toBeNull()
  })
})

describe("pdfWords", () => {
  it("keeps Latin-script lines for the PDF and names the other scripts", () => {
    const w = { text: "Gachibowli\nగచ్చిబౌలి\nNarsingi", scripts: ["Latin", "Telugu"] }
    expect(pdfWords(w)).toEqual({ latin: "Gachibowli / Narsingi", otherScripts: ["Telugu"] })
  })
  it("drops lines with any non-Latin character (the PDF font cannot draw them)", () => {
    expect(pdfWords({ text: "प्लॉट नंबर-१\nपध्दत - 4X4", scripts: ["Latin", "Devanagari"] })).toEqual({ latin: null, otherScripts: ["Devanagari"] })
  })
  it("shortens long text", () => {
    const r = pdfWords({ text: Array.from({ length: 30 }, (_, i) => `Word${i}`).join("\n"), scripts: ["Latin"] }, 40)
    expect(r?.latin?.length).toBeLessThanOrEqual(40)
    expect(r?.latin?.endsWith("...")).toBe(true)
  })
  it("nothing to show", () => expect(pdfWords(undefined)).toBeNull())
})
