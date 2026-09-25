// Campaign cards as Cloudinary transformation URLs ONLY (no image editing in code). PURE.
// Every photo layer pixelates faces; originals are never touched. Text overlays follow Cloudinary's
// rules: commas, slashes and percent signs in overlay text must be double-encoded.
export type CardKind = "instagram" | "story" | "story_hi"
export type CardPhoto = { publicId: string }
export type CardInput = { cloud: string; hero: CardPhoto; before?: CardPhoto | null; headline: string; subline: string; footer?: string; kind: CardKind }

export const HINDI_FONT = "NotoSansDevanagari-Bold.ttf" // uploaded once with `npm run upload-font` (raw, authenticated)
export const CARD_SIZES: Record<CardKind, { w: number; h: number; label: string }> = {
  instagram: { w: 1080, h: 1080, label: "Instagram post (1080x1080)" },
  story: { w: 1080, h: 1920, label: "Story / WhatsApp status (1080x1920)" },
  story_hi: { w: 1080, h: 1920, label: "Hindi WhatsApp status (1080x1920)" },
}

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
const photoLayer = (p: CardPhoto, w: number, h: number, gravity: string) => `l_${layerId(p.publicId)}/${PIXELATE}/c_fill,w_${w},h_${h}/fl_layer_apply,g_${gravity}`

export function cardUrl(input: CardInput, opts: { download?: string } = {}): string {
  const { w, h } = CARD_SIZES[input.kind]
  const font = input.kind === "story_hi" ? HINDI_FONT : "Arial"
  const parts: string[] = []
  if (opts.download) parts.push(`fl_attachment:${opts.download}`)
  parts.push(`${PIXELATE}/c_fill,w_${w},h_${h}`)

  if (input.kind === "instagram" && input.before) {
    parts.push(photoLayer(input.before, w / 2, h, "west"), photoLayer(input.hero, w / 2, h, "east"))
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
  }
  return `https://res.cloudinary.com/${input.cloud}/image/upload/${parts.join("/")}/${input.hero.publicId}.jpg`
}
