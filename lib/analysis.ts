import "server-only"
import { supabase } from "@/lib/supabase"
import { cachedCall } from "@/lib/cache"
import { analyzeImage, embedText, type GeminiAnalysis } from "@/lib/gemini"
import { visionTag, type VisionTags } from "@/lib/vision"
import { recomputeTrust } from "@/lib/trust-db"
import { processVideo } from "@/lib/video-processing"

export type AssetRow = { id: string; public_id: string; secure_url: string; etag: string | null; resource_type: string }
export type AnalysisOutcome = { status: "done" | "failed"; error?: string; apiCalls: number; copiedFrom?: string }
export type Counts = { total: number; pending: number; analyzing: number; done: number; failed: number }

// Small delivery copy of the image: cheaper to send to the AI providers than the original.
const smallUrl = (secureUrl: string) => secureUrl.replace("/upload/", "/upload/c_limit,w_1024,h_1024,f_jpg,q_auto/")

export async function getCounts(): Promise<Counts> {
  const { data } = await supabase.from("assets").select("status")
  const counts: Counts = { total: 0, pending: 0, analyzing: 0, done: 0, failed: 0 }
  for (const row of data ?? []) {
    counts.total++
    if (row.status in counts) counts[row.status as "pending" | "analyzing" | "done" | "failed"]++
  }
  return counts
}

// Exact duplicate (same etag) already analysed -> reuse its results, zero AI calls.
async function copyFromTwin(asset: AssetRow): Promise<string | null> {
  if (!asset.etag) return null
  const { data: twin } = await supabase
    .from("assets")
    .select("id, tags, caption, signals, embedding")
    .eq("etag", asset.etag)
    .eq("status", "done")
    .neq("id", asset.id)
    .limit(1)
    .maybeSingle()
  if (!twin) return null
  const { error } = await supabase
    .from("assets")
    .update({ tags: twin.tags, caption: twin.caption, signals: twin.signals, embedding: twin.embedding, status: "done" })
    .eq("id", asset.id)
  if (error) throw new Error(error.message)
  return twin.id as string
}

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch image (${res.status}) ${url}`)
  return Buffer.from(await res.arrayBuffer()).toString("base64")
}

export async function analyzeAsset(asset: AssetRow): Promise<AnalysisOutcome> {
  let apiCalls = 0
  try {
    if (asset.resource_type === "video") {
      // transcript + key frames (the frames are queued as normal pending images)
      const v = await processVideo(asset)
      return { status: "done", apiCalls: v.apiCalls }
    }
    const twinId = await copyFromTwin(asset)
    if (twinId) {
      await recomputeTrust([asset.id])
      return { status: "done", apiCalls: 0, copiedFrom: twinId }
    }

    const url = smallUrl(asset.secure_url)

    const gemini = await cachedCall<GeminiAnalysis>("gemini_analysis", asset.id, { model: "flash", v: 1 }, async () =>
      analyzeImage(await fetchBase64(url), "image/jpeg"),
    )
    if (!gemini.cached) apiCalls++
    const vision = await cachedCall<VisionTags>("ai_vision_tagging", asset.id, { v: 1 }, () => visionTag(url))
    if (!vision.cached) apiCalls++

    const { caption, signals } = gemini.result

    const tags = new Set(vision.result.tags)
    if (signals.garbage_visible) tags.add("garbage_present")
    if (signals.vegetation !== "none") tags.add("vegetation")

    const embedSource = [caption, [...tags].join(" ")].filter(Boolean).join(". ")
    let embedding: number[] | null = null
    if (embedSource) {
      const emb = await cachedCall<number[]>("gemini_embedding", asset.id, { text: embedSource, dims: 768 }, () => embedText(embedSource))
      if (!emb.cached) apiCalls++
      embedding = emb.result
    }

    const { error } = await supabase
      .from("assets")
      .update({
        tags: [...tags],
        caption,
        signals,
        embedding: embedding ? JSON.stringify(embedding) : null,
        status: "done",
      })
      .eq("id", asset.id)
    if (error) throw new Error(error.message)
    await recomputeTrust([asset.id])
    return { status: "done", apiCalls }
  } catch (err) {
    if (err instanceof Error && err.name === "RateLimitError") throw err
    return { status: "failed", error: err instanceof Error ? err.message : String(err), apiCalls }
  }
}
