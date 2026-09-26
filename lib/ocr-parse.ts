// Parses Cloudinary's OCR add-on result ("Text Detection and Extraction" by Google, `ocr: "adv_ocr"`). PURE.
import { z } from "zod"

export type PhotoText = { text: string | null; locale: string | null }

const schema = z.object({
  status: z.string(),
  data: z.array(z.object({ textAnnotations: z.array(z.object({ description: z.string(), locale: z.string().optional() })).optional() })).optional(),
})

// The first annotation is the whole text block; later ones are single words. Blank or unreadable -> null text.
export function parseOcr(info: unknown): PhotoText {
  const parsed = schema.safeParse((info as { ocr?: { adv_ocr?: unknown } } | null)?.ocr?.adv_ocr)
  if (!parsed.success || parsed.data.status !== "complete") return { text: null, locale: null }
  const first = parsed.data.data?.[0]?.textAnnotations?.[0]
  const text = first?.description.replace(/[ \t]+\n/g, "\n").trim() ?? ""
  return { text: text.length >= 2 ? text : null, locale: first?.locale ?? null }
}

// Same search rule as transcripts: case-insensitive "contains".
export const textMatches = (t: PhotoText | null, q: string) => !!t?.text && t.text.toLowerCase().includes(q.trim().toLowerCase())

// Which writing systems appear in the text (OCR reports one locale even for mixed signs, e.g. English + Telugu).
const SCRIPTS: [string, RegExp][] = [
  ["Latin", /[A-Za-z]/], ["Devanagari", /[ऀ-ॿ]/], ["Bengali", /[ঀ-৿]/], ["Gurmukhi", /[਀-੿]/],
  ["Gujarati", /[઀-૿]/], ["Odia", /[଀-୿]/], ["Tamil", /[஀-௿]/], ["Telugu", /[ఀ-౿]/],
  ["Kannada", /[ಀ-೿]/], ["Malayalam", /[ഀ-ൿ]/], ["Arabic", /[؀-ۿ]/],
]
export const scriptsIn = (text: string | null): string[] => (text ? SCRIPTS.filter(([, re]) => re.test(text)).map(([name]) => name) : [])

// Short texts read best as they appear on the sign; long ones (many short lines) as compact pieces.
export const textLines = (text: string | null): string[] => (text ?? "").split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
