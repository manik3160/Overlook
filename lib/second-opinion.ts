import "server-only"
import { cachedCall } from "@/lib/cache"
import { supabase } from "@/lib/supabase"
import { visionAsk } from "@/lib/vision"
import { parseYesNo, SCREEN_CHECK_INPUT, SCREEN_CHECK_KIND, SCREEN_PROMPT } from "@/lib/vision-prompts"

// Cloudinary AI Vision second opinion on the "photo of a screen or print" flag. Asked ONLY for photos Gemini already
// flagged (about 320 AI Vision units each), cached in `analyses`. It never changes the score: it tells the reviewer
// whether a second, independent AI agrees.
const KIND = SCREEN_CHECK_KIND
export type ScreenOpinion = { agrees: boolean | null; answer: string }

export async function screenSecondOpinion(asset: { id: string; secure_url: string }): Promise<ScreenOpinion | null> {
  try {
    const url = asset.secure_url.replace("/upload/", "/upload/c_limit,w_1024,h_1024,f_jpg,q_auto/")
    const { result } = await cachedCall<ScreenOpinion>(KIND, asset.id, SCREEN_CHECK_INPUT, async () => {
      const { answers } = await visionAsk(url, [SCREEN_PROMPT])
      const answer = answers[0] ?? ""
      return { agrees: parseYesNo(answer), answer }
    })
    return result
  } catch (e) {
    console.error(`[second-opinion] ${asset.id}:`, e instanceof Error ? e.message : e)
    return null
  }
}

export async function loadScreenOpinion(assetId: string): Promise<ScreenOpinion | null> {
  const { data } = await supabase.from("analyses").select("result").eq("asset_id", assetId).eq("kind", KIND).order("created_at", { ascending: false }).limit(1).maybeSingle()
  return (data?.result as ScreenOpinion | undefined) ?? null
}
