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
