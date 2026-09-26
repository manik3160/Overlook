import "server-only"
import { GoogleGenAI, ApiError, ThinkingLevel } from "@google/genai"
import { z } from "zod"
import { RateLimitError } from "@/lib/errors"
import { factsText, type Narrative, type StoryFacts } from "@/lib/story"
import { extractedClaimsSchema, type Claim } from "@/lib/claims"

// Free-tier daily quotas differ a lot per model (gemini-3.6-flash allows only 20 requests/day), so the default is a flash-lite model and it is configurable.
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.1-flash-lite"
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

const changeSchema = z.string().trim().min(10)

// Factual before/after description for one pair of photos of the same place.
export async function summarizeChange(beforeBase64: string, afterBase64: string, daysApart: number): Promise<string> {
  const prompt = `The first image is a BEFORE photo and the second is an AFTER photo of the same place, taken ${daysApart} days apart during a community or environmental field project.
In 2 to 3 short factual sentences, describe only what visibly changed (for example litter, vegetation, structures, water, people). Do not speculate about causes or effort. If nothing visible changed, say so. Plain text only.`
  try {
    const res = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: beforeBase64 } }, { inlineData: { mimeType: "image/jpeg", data: afterBase64 } }] }],
      config: { temperature: 0, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
    })
    return changeSchema.parse(res.text)
  } catch (err) {
    return rethrow(err)
  }
}

const narrativeSchema = z.object({ problem: z.string().trim().min(10).max(500), action: z.string().trim().min(10).max(500), result: z.string().trim().min(10).max(500) })

// Short impact story written ONLY from the supplied (verified) facts. Text-only call.
export async function writeStory(facts: StoryFacts): Promise<Narrative> {
  const prompt = `Write a short impact story for donors about a community field project, in three parts.
Do not use em dashes or en dashes; use commas or full stops instead. Use ONLY the facts in the JSON below. Do not invent numbers, names, places, quantities or outcomes that are not in the facts. If a fact is missing, leave it out.
Return ONLY JSON: {"problem": 1-2 sentences on the situation, "action": 1-2 sentences on what was done, "result": 1-2 sentences on the outcome using the given numbers}.
Each percentage in the facts is the share of PHOTOS (before-set or after-set) that show that condition, not a share of time or activity: describe it as "photos showing ..." or "in X% of the after photos". Plain, factual, warm tone. No exaggeration.

FACTS:
${factsText(facts)}`
  try {
    const res = await ai.models.generateContent({ model: VISION_MODEL, contents: prompt, config: { responseMimeType: "application/json", temperature: 0.3, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } })
    return narrativeSchema.parse(JSON.parse(res.text ?? ""))
  } catch (err) {
    return rethrow(err)
  }
}

const transcriptSchema = z.object({ language: z.string(), transcript: z.string(), summary: z.string() })
export type Transcription = z.infer<typeof transcriptSchema>

// Speech to text for a video's audio track (mp3). Language is auto-detected; Hindi comes back in Devanagari.
export async function transcribeAudio(base64Mp3: string): Promise<Transcription> {
  const prompt = `Transcribe the speech in this audio exactly as spoken, in its original language (write Hindi in Devanagari script).
Return ONLY JSON: {"language": the language name in English, "transcript": the full transcript, "summary": one plain factual English sentence saying what the speaker describes}.
If there is no intelligible speech, return {"language": "none", "transcript": "", "summary": ""}. Do not invent words.`
  try {
    const res = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "audio/mpeg", data: base64Mp3 } }] }],
      config: { responseMimeType: "application/json", temperature: 0, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
    })
    return transcriptSchema.parse(JSON.parse(res.text ?? ""))
  } catch (err) {
    return rethrow(err)
  }
}

// Claim Checker: split an NGO report paragraph into atomic, checkable claims. The model only extracts; the
// verdicts are decided by lib/claims.ts against verified photos.
export async function extractClaims(reportText: string): Promise<Claim[]> {
  const prompt = `Below is text from an NGO or CSR project report. Split it into at most 8 atomic factual claims that photos of the project site could support or not.
Return ONLY JSON: {"claims": [{"text": the claim as written, "type": "activity" | "change" | "quantity" | "date", "subject": a short plain description of what a photo proving it would show (for example "people collecting litter on a riverbank"), "number": the number claimed or null, "unit": its unit or null, "dateFrom": "YYYY-MM-DD" or null, "dateTo": "YYYY-MM-DD" or null}]}
Use "change" for before/after improvements, "quantity" when a number is the point, "date" when the timing is the point, otherwise "activity". For a month use its first and last day. Skip opinions, goals and thanks. Do not invent claims.

REPORT TEXT:
${reportText}`
  try {
    const res = await ai.models.generateContent({ model: VISION_MODEL, contents: prompt, config: { responseMimeType: "application/json", temperature: 0, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } })
    return extractedClaimsSchema.parse(JSON.parse(res.text ?? "")).claims
  } catch (err) {
    return rethrow(err)
  }
}

const claimMatchSchema = z.object({ matches: z.array(z.object({ claim: z.number().int().min(0), photo_ids: z.array(z.string()) })) })
export type ClaimCandidate = { id: string; caption: string; tags: string[]; date: string | null }

// Claim Checker, step 2: which photos DIRECTLY show each claim, judged from their AI captions, tags and dates.
// Text similarity alone is too loose (every photo of a wooded site "matches" "planted trees"). Returns only
// ids from the candidate list; anything else the model says is dropped.
export async function matchClaimsToPhotos(claims: Claim[], photos: ClaimCandidate[]): Promise<Map<number, string[]>> {
  const known = new Set(photos.map((p) => p.id))
  const prompt = `You check claims from an NGO report against descriptions of the project's photos.
A photo supports a claim ONLY if its caption or tags directly show what the claim says (the activity, the object, the state of the site). Similar surroundings are NOT enough: trees in the background do not show "trees were planted", a building does not show "a library was built". Ignore numbers (photos cannot count) and dates (checked separately). When unsure, leave the photo out.
Return ONLY JSON: {"matches": [{"claim": claim index, "photo_ids": [ids of supporting photos, possibly empty]}]} with one entry per claim.

CLAIMS:
${claims.map((c, i) => `${i}. ${c.text}`).join("\n")}

PHOTOS:
${photos.map((p) => `${p.id} | ${p.date ?? "undated"} | tags: ${p.tags.join(", ") || "none"} | ${p.caption}`).join("\n")}`
  try {
    const res = await ai.models.generateContent({ model: VISION_MODEL, contents: prompt, config: { responseMimeType: "application/json", temperature: 0, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } })
    const out = new Map<number, string[]>()
    for (const m of claimMatchSchema.parse(JSON.parse(res.text ?? "")).matches) if (m.claim < claims.length) out.set(m.claim, [...new Set(m.photo_ids.filter((id) => known.has(id)))])
    return out
  } catch (err) {
    return rethrow(err)
  }
}
