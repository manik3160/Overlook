import "server-only"
import { GoogleGenAI, ApiError, ThinkingLevel } from "@google/genai"
import { z } from "zod"
import { RateLimitError } from "@/lib/errors"

const VISION_MODEL = "gemini-3.6-flash"
const EMBED_MODEL = "gemini-embedding-001"
export const EMBED_DIMS = 768

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export const geminiAnalysisSchema = z.object({
  caption: z.string().nullable(),
  signals: z.object({
    people_working: z.number().int().min(0),
    water_present: z.boolean(),
    garbage_visible: z.boolean(),
    vegetation: z.enum(["none", "sparse", "dense"]),
    structure_stage: z.enum(["none", "in_progress", "complete"]),
    safety_gear: z.boolean(),
  }),
  checks: z.object({
    photo_of_screen_or_print: z.boolean(),
    people_doing_physical_work: z.boolean(),
    unrelated_to_field_work: z.boolean(),
  }),
})
export type GeminiAnalysis = z.infer<typeof geminiAnalysisSchema>

const PROMPT = `You are analysing one photo from a community, environmental or infrastructure field project in India.
Return ONLY a JSON object with exactly this shape:
{
  "caption": one factual sentence describing what is visible, no speculation (null if the image is too dark, blurry or unrecognizable),
  "signals": {
    "people_working": integer count of people visibly doing physical work,
    "water_present": boolean,
    "garbage_visible": boolean,
    "vegetation": "none" | "sparse" | "dense",
    "structure_stage": "none" | "in_progress" | "complete",
    "safety_gear": boolean (gloves, helmet or vest visible)
  },
  "checks": {
    "photo_of_screen_or_print": boolean (true if this is a photo of a screen, monitor or printed photograph),
    "people_doing_physical_work": boolean,
    "unrelated_to_field_work": boolean (true if unrelated to field, community or environmental work)
  }
}`

function rethrow(err: unknown): never {
  if (err instanceof ApiError && (err.status === 429 || err.status === 503)) throw new RateLimitError("Gemini", err.message)
  throw err
}

export async function analyzeImage(base64: string, mimeType: string): Promise<GeminiAnalysis> {
  try {
    const res = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: "user", parts: [{ text: PROMPT }, { inlineData: { mimeType, data: base64 } }] }],
      config: { responseMimeType: "application/json", temperature: 0, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
    })
    return geminiAnalysisSchema.parse(JSON.parse(res.text ?? ""))
  } catch (err) {
    return rethrow(err)
  }
}

export async function embedText(text: string): Promise<number[]> {
  try {
    const res = await ai.models.embedContent({
      model: EMBED_MODEL,
      contents: text,
      config: { outputDimensionality: EMBED_DIMS, taskType: "SEMANTIC_SIMILARITY" },
    })
    const values = res.embeddings?.[0]?.values
    if (!values || values.length !== EMBED_DIMS) throw new Error(`Embedding has ${values?.length} dims, expected ${EMBED_DIMS}`)
    return values
  } catch (err) {
    return rethrow(err)
  }
}
