import "server-only"
import { z } from "zod"
import { visionTagDefs, fromApiName } from "@/lib/taxonomy"
import { RateLimitError } from "@/lib/errors"

const responseSchema = z.object({
  limits: z.object({ addons_quota: z.array(z.object({ used_by_request: z.number(), remaining: z.number() })) }).optional(),
  data: z.object({ analysis: z.object({ tags: z.array(z.object({ name: z.string() })) }) }),
})

export type VisionTags = { tags: string[]; unitsUsed: number | null; unitsRemaining: number | null }

// Cloudinary AI Vision tagging against our taxonomy (one request, <= 10 definitions).
export async function visionTag(imageUrl: string): Promise<VisionTags> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const auth = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString("base64")
  const res = await fetch(`https://api.cloudinary.com/v2/analysis/${cloud}/analyze/ai_vision_tagging`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({ source: { uri: imageUrl }, tag_definitions: visionTagDefs() }),
  })
  const body = await res.json().catch(() => null)
  if (res.status === 429) throw new RateLimitError("Cloudinary AI Vision", JSON.stringify(body))
  if (!res.ok) throw new Error(`AI Vision HTTP ${res.status}: ${JSON.stringify(body?.error ?? body)}`)

  const parsed = responseSchema.parse(body)
  const quota = parsed.limits?.addons_quota[0]
  return {
    tags: parsed.data.analysis.tags.map((t) => fromApiName(t.name)),
    unitsUsed: quota?.used_by_request ?? null,
    unitsRemaining: quota?.remaining ?? null,
  }
}
