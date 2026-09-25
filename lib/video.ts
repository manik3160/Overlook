// Video helpers. PURE. A video is stored as one asset; key frames become separate IMAGE assets
// (parent_asset_id + frame_second) so they flow through the normal analysis and trust pipeline.
export const MAX_FRAMES = 8
export const FRAME_STEP_S = 15
export const MAX_AUDIO_S = 300 // transcribe at most the first 5 minutes

// About one frame every 15 s, at most 8 (longer videos are spread evenly), each just after a boundary
// (t = 1 s, 16 s, 31 s ...) to avoid the black frame at 0 s.
export function frameSeconds(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return []
  const step = Math.max(FRAME_STEP_S, duration / MAX_FRAMES)
  const first = duration < 2 ? 0 : 1
  const count = Math.min(MAX_FRAMES, Math.ceil(duration / step))
  const seconds: number[] = []
  for (let i = 0; i < count; i++) {
    const t = Math.floor(i * step) + first
    if (t <= duration - 0.5 || (i === 0 && t <= duration)) seconds.push(t)
  }
  return seconds
}

export const formatClock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`

// Deterministic, so re-processing a video overwrites its frames instead of duplicating them.
export const framePublicId = (parentPublicId: string, second: number): string => `evidence/frames/${parentPublicId.split("/").pop()}-s${second}`

const base = (cloud: string) => `https://res.cloudinary.com/${cloud}/video/upload`
export const frameSourceUrl = (cloud: string, parentPublicId: string, second: number): string => `${base(cloud)}/so_${second}/${parentPublicId}.jpg`
export const audioSourceUrl = (cloud: string, parentPublicId: string): string => `${base(cloud)}/du_${MAX_AUDIO_S}/${parentPublicId}.mp3`

// Browsers seek with a media fragment: video.mp4#t=16
export const playerUrl = (videoUrl: string, second: number): string => `${videoUrl.split("#")[0]}#t=${Math.max(0, Math.floor(second))}`

// A short excerpt of the transcript around the first match of the query (or the start when there is none).
export function snippet(text: string, query: string, radius = 70): string {
  const clean = text.replace(/\s+/g, " ").trim()
  const at = query ? clean.toLowerCase().indexOf(query.trim().toLowerCase()) : -1
  if (at < 0) return clean.length > radius * 2 ? `${clean.slice(0, radius * 2)}…` : clean
  const from = Math.max(0, at - radius)
  const to = Math.min(clean.length, at + query.trim().length + radius)
  return `${from > 0 ? "…" : ""}${clean.slice(from, to)}${to < clean.length ? "…" : ""}`
}
