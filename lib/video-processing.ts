import "server-only"
import { supabase } from "@/lib/supabase"
import { cloudinary } from "@/lib/cloudinary"
import { cachedCall } from "@/lib/cache"
import { embedText, transcribeAudio, type Transcription } from "@/lib/gemini"
import { recomputeTrust } from "@/lib/trust-db"
import { audioSourceUrl, frameSeconds, framePublicId, frameSourceUrl } from "@/lib/video"

type VideoRow = { id: string; public_id: string; project_id: string | null; taken_at: string | null; lat: number | null; lng: number | null; has_exif: boolean }
export type VideoOutcome = { apiCalls: number; frames: number; transcribed: boolean; hasAudio: boolean }

const NO_SPEECH: Transcription = { language: "none", transcript: "", summary: "" }
const cloud = () => process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!

// Key frames become real IMAGE assets (uploaded from a Cloudinary frame URL), so phash, face pixelation,
// tagging and trust all work on them exactly like on a photo. Re-running overwrites, never duplicates.
async function extractFrames(video: VideoRow, duration: number): Promise<string[]> {
  const ids: string[] = []
  for (const second of frameSeconds(duration)) {
    const publicId = framePublicId(video.public_id, second)
    const up = await cloudinary.uploader.upload(frameSourceUrl(cloud(), video.public_id, second), { public_id: publicId, overwrite: true, phash: true })
    const { data, error } = await supabase
      .from("assets")
      .upsert(
        {
          public_id: up.public_id, asset_id: up.asset_id, resource_type: "image", secure_url: up.secure_url, etag: up.etag, phash: up.phash ?? null,
          width: up.width, height: up.height, parent_asset_id: video.id, frame_second: second, project_id: video.project_id,
          // a frame inherits the video's time (plus its offset) and place
          taken_at: video.taken_at ? new Date(Date.parse(video.taken_at) + second * 1000).toISOString() : null,
          lat: video.lat, lng: video.lng, has_exif: video.has_exif,
        },
        { onConflict: "public_id", ignoreDuplicates: false },
      )
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    ids.push(data.id as string)
  }
  return ids
}

async function fetchAudioBase64(publicId: string): Promise<string | null> {
  const res = await fetch(audioSourceUrl(cloud(), publicId))
  if (!res.ok) return null // e.g. no audio stream
  return Buffer.from(await res.arrayBuffer()).toString("base64")
}

export async function processVideo(asset: { id: string; public_id: string }): Promise<VideoOutcome> {
  let apiCalls = 0
  const { data: video, error } = await supabase.from("assets").select("id, public_id, project_id, taken_at, lat, lng, has_exif").eq("id", asset.id).single<VideoRow>()
  if (error) throw new Error(error.message)

  // `media_metadata` is the flag that returns duration and has_audio (video_metadata returns neither).
  const info = await cloudinary.api.resource(video.public_id, { resource_type: "video", media_metadata: true } as never)
  const duration = Number(info.duration)
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Could not read the video's duration from Cloudinary, so no key frames were extracted.")
  const frameIds = await extractFrames(video, duration)

  // Silent videos skip the AI call entirely.
  let tr: Transcription = NO_SPEECH
  if (info.has_audio !== false) {
    const { result, cached } = await cachedCall<Transcription>("gemini_transcript", video.id, { v: 1 }, async () => {
      const audio = await fetchAudioBase64(video.public_id)
      return audio ? transcribeAudio(audio) : NO_SPEECH
    })
    tr = result
    if (!cached && (tr.transcript || tr.summary)) apiCalls++
  }

  // Embed what was said so the video can be found by meaning; exact words are matched separately in search.
  const spoken = [tr.summary, tr.transcript.slice(0, 1500)].filter(Boolean).join(". ")
  let embedding: number[] | null = null
  if (spoken) {
    const emb = await cachedCall<number[]>("gemini_embedding", video.id, { text: spoken, dims: 768 }, () => embedText(spoken))
    if (!emb.cached) apiCalls++
    embedding = emb.result
  }

  const { error: updateError } = await supabase
    .from("assets")
    .update({ transcript: tr.transcript || null, caption: tr.summary || null, embedding: embedding ? JSON.stringify(embedding) : null, status: "done" })
    .eq("id", video.id)
  if (updateError) throw new Error(updateError.message)
  await recomputeTrust([video.id, ...frameIds])
  return { apiCalls, frames: frameIds.length, transcribed: !!tr.transcript, hasAudio: info.has_audio !== false }
}
