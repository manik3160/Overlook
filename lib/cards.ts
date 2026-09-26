// Campaign cards as Cloudinary transformation URLs ONLY (no image editing in code). PURE.
// Every photo layer pixelates faces; originals are never touched. Text overlays follow Cloudinary's
// rules: commas, slashes and percent signs in overlay text must be double-encoded.
export type CardKind = "instagram" | "story" | "story_hi" | "story_ai"
export type CardPhoto = { publicId: string }
// `smart`: Cloudinary smart crop (g_auto) keeps the interesting part of each photo in frame instead of the centre.
// Off by default so existing card URLs never change.
export type CardInput = { cloud: string; hero: CardPhoto; before?: CardPhoto | null; headline: string; subline: string; footer?: string; kind: CardKind; smart?: boolean }

export const HINDI_FONT = "NotoSansDevanagari-Bold.ttf" // uploaded once with `npm run upload-font` (raw, authenticated)
export const CARD_SIZES: Record<CardKind, { w: number; h: number; label: string }> = {
  instagram: { w: 1080, h: 1080, label: "Instagram post (1080x1080)" },
  story: { w: 1080, h: 1920, label: "Story / WhatsApp status (1080x1920)" },
  story_hi: { w: 1080, h: 1920, label: "Hindi WhatsApp status (1080x1920)" },
  story_ai: { w: 1080, h: 1920, label: "AI-extended story (1080x1920)" },
}

// story_ai: instead of cropping a wide photo, Cloudinary generative fill paints the missing top and bottom. Faces are
// pixelated AFTER the fill, so invented areas are covered too. Campaign copy only: never used as evidence.
export const GEN_FILL = "b_gen_fill"
export const AI_LABEL = "Edges filled by AI"

// encodeURIComponent, then double-encode the three characters Cloudinary treats specially in overlay text.
export const escapeOverlayText = (text: string): string => encodeURIComponent(text).replace(/%(25|2C|2F)/g, "%25$1")

export const PIXELATE = "e_pixelate_faces"
export const layerId = (publicId: string) => publicId.replace(/\//g, ":")

export type TextOpts = { font: string; size: number; width: number; gravity: string; x?: number; y?: number; bg?: string }
export function textLayer(text: string, o: TextOpts): string {
  const style = o.font === "Arial" ? `${o.font}_${o.size}_bold` : `${o.font}_${o.size}`
  const placement = [`g_${o.gravity}`, o.x !== undefined ? `x_${o.x}` : "", o.y !== undefined ? `y_${o.y}` : ""].filter(Boolean).join(",")
  return `l_text:${style}:${escapeOverlayText(text)},co_white,w_${o.width},c_fit,b_rgb:${o.bg ?? "000000B3"}/fl_layer_apply,${placement}`
}
const fill = (smart?: boolean) => (smart ? "c_fill,g_auto" : "c_fill")
const photoLayer = (p: CardPhoto, w: number, h: number, gravity: string, smart?: boolean) => `l_${layerId(p.publicId)}/${PIXELATE}/${fill(smart)},w_${w},h_${h}/fl_layer_apply,g_${gravity}`

export function cardUrl(input: CardInput, opts: { download?: string } = {}): string {
  const { w, h } = CARD_SIZES[input.kind]
  const font = input.kind === "story_hi" ? HINDI_FONT : "Arial"
  const parts: string[] = []
  if (opts.download) parts.push(`fl_attachment:${opts.download}`)
  if (input.kind === "story_ai") parts.push(`c_pad,w_${w},h_${h},${GEN_FILL}`, PIXELATE)
  else parts.push(`${PIXELATE}/${fill(input.smart)},w_${w},h_${h}`)

  if (input.kind === "instagram" && input.before) {
    parts.push(photoLayer(input.before, w / 2, h, "west", input.smart), photoLayer(input.hero, w / 2, h, "east", input.smart))
    parts.push(textLayer("BEFORE", { font: "Arial", size: 34, width: 300, gravity: "north_west", x: 24, y: 24 }))
    parts.push(textLayer("AFTER", { font: "Arial", size: 34, width: 300, gravity: "north_west", x: w / 2 + 24, y: 24 }))
    parts.push(textLayer(input.headline, { font, size: 52, width: 980, gravity: "south", y: 120 }))
    parts.push(textLayer(input.subline, { font, size: 30, width: 980, gravity: "south", y: 40 }))
  } else if (input.kind === "instagram") {
    parts.push(textLayer(input.headline, { font, size: 56, width: 980, gravity: "south", y: 120 }))
    parts.push(textLayer(input.subline, { font, size: 30, width: 980, gravity: "south", y: 40 }))
  } else {
    parts.push(textLayer(input.headline, { font, size: 78, width: 940, gravity: "north", y: 300 }))
    // The Devanagari font has no Latin glyphs, so a Latin footer (project name, brand) always uses Arial.
    parts.push(textLayer(input.subline, { font, size: 40, width: 940, gravity: "south", y: input.footer ? 160 : 140 }))
    if (input.footer) parts.push(textLayer(input.footer, { font: "Arial", size: 34, width: 940, gravity: "south", y: 80 }))
    if (input.kind === "story_ai") parts.push(textLayer(AI_LABEL, { font: "Arial", size: 28, width: 600, gravity: "north_east", x: 32, y: 32 }))
  }
  return `https://res.cloudinary.com/${input.cloud}/image/upload/${parts.join("/")}/${input.hero.publicId}.jpg`
}

// Where the real photo sits inside an AI-extended card, as percentages of the card (for outlining it on screen).
// c_pad scales the photo to fit inside the card and centres it; everything outside this box was painted by AI.
export function realArea(photoW: number, photoH: number, kind: CardKind = "story_ai"): { top: number; left: number; width: number; height: number } {
  const { w, h } = CARD_SIZES[kind]
  const scale = Math.min(w / photoW, h / photoH)
  const width = (photoW * scale) / w, height = (photoH * scale) / h
  const pct = (n: number) => Math.round(n * 1000) / 10
  return { top: pct((1 - height) / 2), left: pct((1 - width) / 2), width: pct(width), height: pct(height) }
}

// Same photo, same size, centre crop vs Cloudinary smart crop: for the side-by-side on the Campaign tab.
export function cropCompareUrls(cloud: string, publicId: string, w = 540, h = 960): { plain: string; smart: string } {
  const url = (crop: string) => `https://res.cloudinary.com/${cloud}/image/upload/${PIXELATE}/${crop},w_${w},h_${h}/q_auto,f_auto/${publicId}.jpg`
  return { plain: url("c_fill"), smart: url("c_fill,g_auto") }
}
