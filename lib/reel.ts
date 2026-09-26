// Highlight reel as Cloudinary URLs ONLY. PURE: plans the slides and builds the URLs.
// Two stages, because Cloudinary ignores e_pixelate_faces inside a spliced layer and places timed
// text overlays unreliably on a spliced video (both verified against the live account):
//   1. each slide is a finished 1080x1080 IMAGE (faces pixelated, caption burned in), like the cards;
//   2. the reel splices those stored slides after a short black base video, with crossfades.
import { layerId, PIXELATE, textLayer } from "./cards"

export const REEL_BASE = "overlook/reel-base" // 3 s black 1080x1080 clip, uploaded once with `npm run upload-reel-base`
export const REEL_SIZE = 1080
export const LEAD_S = 1 // black lead-in before the first slide
export const SLIDE_S = 3 // each slide's own length
export const FADE_S = 1 // crossfade, overlaps the neighbouring slides
export const MAX_EXTRA_PHOTOS = 4

export type ReelPhoto = { publicId: string; takenAt: string | null; peopleWorking: number; trust: number }
export type ReelSlide =
  | { kind: "title"; background: string; title: string; subtitle: string }
  | { kind: "photo"; publicId: string; label: string }
  | { kind: "end"; background: string; headline: string; subtitle: string }
export type ReelPlanInput = {
  projectName: string
  verifiedCount: number
  headline: string
  pair: { before: ReelPhoto; after: ReelPhoto } | null
  photos: ReelPhoto[] // verified images only; the caller must never pass unverified evidence
  formatDay: (iso: string) => string
}

// Title, BEFORE, a few more verified photos in date order, AFTER, closing number. Extras are chosen by
// people at work, then trust, and shown chronologically so the reel reads before -> during -> after.
export function planReel(input: ReelPlanInput): ReelSlide[] {
  const { pair, formatDay } = input
  const inPair = new Set(pair ? [pair.before.publicId, pair.after.publicId] : [])
  const extras = input.photos
    .filter((p) => !inPair.has(p.publicId))
    .sort((a, b) => b.peopleWorking - a.peopleWorking || b.trust - a.trust || a.publicId.localeCompare(b.publicId))
    .slice(0, MAX_EXTRA_PHOTOS)
    .sort((a, b) => (a.takenAt ?? "\uffff").localeCompare(b.takenAt ?? "\uffff") || a.publicId.localeCompare(b.publicId))
  const hero = pair?.after ?? extras[0]
  if (!hero) return []

  const dated = (prefix: string, p: ReelPhoto) => (p.takenAt ? `${prefix} · ${formatDay(p.takenAt)}` : prefix)
  const n = input.verifiedCount
  const slides: ReelSlide[] = [
    { kind: "title", background: (pair?.before ?? hero).publicId, title: input.projectName, subtitle: `${n} verified photo${n === 1 ? "" : "s"}` },
  ]
  if (pair) slides.push({ kind: "photo", publicId: pair.before.publicId, label: dated("BEFORE", pair.before) })
  for (const p of extras) slides.push({ kind: "photo", publicId: p.publicId, label: p.peopleWorking > 0 ? dated("ON SITE", p) : dated("VERIFIED", p) })
  if (pair) slides.push({ kind: "photo", publicId: pair.after.publicId, label: dated("AFTER", pair.after) })
  slides.push({ kind: "end", background: hero.publicId, headline: input.headline, subtitle: "Every photo traceable to its original" })
  return slides
}

// Stage 1: one finished slide image. Faces are pixelated before anything else is drawn.
export function slideUrl(cloud: string, slide: ReelSlide): string {
  const size = `c_fill,w_${REEL_SIZE},h_${REEL_SIZE}`
  const parts = [`${PIXELATE}/${size}`]
  if (slide.kind === "photo") {
    parts.push(textLayer(slide.label, { font: "Arial", size: 40, width: 900, gravity: "north_west", x: 40, y: 40 }))
  } else {
    parts.push("e_blur:600/e_brightness:-55")
    const [big, small] = slide.kind === "title" ? [slide.title, slide.subtitle] : [slide.headline, slide.subtitle]
    parts.push(textLayer(big, { font: "Arial", size: 72, width: 940, gravity: "center", y: -40, bg: "00000000" }))
    parts.push(textLayer(small, { font: "Arial", size: 38, width: 940, gravity: "center", y: 90, bg: "00000000" }))
  }
  const id = slide.kind === "photo" ? slide.publicId : slide.background
  return `https://res.cloudinary.com/${cloud}/image/upload/${parts.join("/")}/${id}.jpg`
}

export type Pace = { slide: number; fade: number }
export const REEL_PACE: Pace = { slide: SLIDE_S, fade: FADE_S }
// Time-lapse of one spot: quicker, and the long dissolve makes the aligned photos "morph" into each other.
export const TIMELAPSE_PACE: Pace = { slide: 2, fade: 1 }

// Stage 2: the reel. `slideIds` are the stored slide images, in order.
export function reelUrl(cloud: string, slideIds: string[], opts: { download?: string; pace?: Pace } = {}): string {
  const { slide, fade } = opts.pace ?? REEL_PACE
  const parts: string[] = []
  if (opts.download) parts.push(`fl_attachment:${opts.download}`)
  parts.push(`du_${LEAD_S}`)
  for (const id of slideIds) {
    parts.push(`fl_splice:transition_(name_fade;du_${fade}),l_${layerId(id)},c_fill,w_${REEL_SIZE},h_${REEL_SIZE},du_${slide}/fl_layer_apply`)
  }
  return `https://res.cloudinary.com/${cloud}/video/upload/${parts.join("/")}/${REEL_BASE}.mp4`
}

// Length of the finished reel: every crossfade overlaps two neighbours by the fade length.
export const reelSeconds = (slideCount: number, pace: Pace = REEL_PACE) => (slideCount === 0 ? 0 : LEAD_S + slideCount * pace.slide - slideCount * pace.fade)

// Ghost Camera time-lapse: the first photo and every retake lined up with it, oldest first, each dated.
export type ChainPhoto = { publicId: string; takenAt: string | null }
export function planTimelapse(chain: ChainPhoto[], formatDay: (iso: string) => string): ReelSlide[] {
  const dated = [...chain].filter((p) => p.takenAt).sort((a, b) => a.takenAt!.localeCompare(b.takenAt!))
  if (dated.length < 2) return []
  return dated.map((p, i) => ({ kind: "photo", publicId: p.publicId, label: `${i === 0 ? "BEFORE" : i === dated.length - 1 ? "LATEST" : `RETAKE ${i}`} · ${formatDay(p.takenAt!)}` }))
}
