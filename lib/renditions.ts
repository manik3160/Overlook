// Every version Cloudinary makes from ONE uploaded photo, for the "What Cloudinary made from this photo" strip. PURE.
// Built only from the URL builders the app already uses, so each tile is exactly what the app really shows.
import { blurUrl, slideUrl, thumbUrl } from "./cloudinary-url"
import { reportThumbUrl } from "./manifest"
import { cardUrl } from "./cards"
import { VERIFIED_SCORE } from "./signals"

// `preview` is what the tile displays (a small copy for the original, so the strip never downloads the full file).
export type Rendition = { key: string; label: string; sentence: string; size: string; url: string; preview: string; recipe: string; pixelated: boolean }
export type RenditionAsset = { public_id: string; secure_url: string; resource_type: string; trust_score: number | null; review_status: string; width: number | null; height: number | null }

// The transformation part of a Cloudinary delivery URL: what sits between "/upload/" and the version or public id.
export function recipeOf(url: string, publicId: string): string {
  const i = url.indexOf("/upload/")
  if (i < 0) return ""
  const rest = url.slice(i + "/upload/".length)
  const ends = [rest.search(/(^|\/)v\d+\//), rest.indexOf(publicId)].filter((n) => n >= 0)
  const end = ends.length ? Math.min(...ends) : rest.length
  return rest.slice(0, end).replace(/\/$/, "")
}

// Same photo, same size, faces hidden: as uploaded vs improved by Cloudinary AI (e_enhance). For the slider.
export function enhanceCompare(secureUrl: string): { before: string; after: string } {
  const at = (tx: string) => secureUrl.replace("/upload/", `/upload/${tx}e_pixelate_faces/c_limit,w_800,h_800,f_auto,q_auto/`)
  return { before: at(""), after: at("e_enhance/") }
}

export function renditionsFor(asset: RenditionAsset, opts: { cloud: string; projectName: string | null }): Rendition[] {
  const video = asset.resource_type === "video"
  const make = (key: string, label: string, sentence: string, size: string, url: string): Rendition => {
    const recipe = recipeOf(url, asset.public_id)
    const preview = key === "original" && !video ? url.replace("/upload/", "/upload/c_limit,w_480,h_480,f_auto,q_auto/") : url
    return { key, label, sentence, size, url, preview, recipe, pixelated: recipe.includes("pixelate_faces") }
  }
  const original = asset.width && asset.height ? `${asset.width}×${asset.height}` : "original size"
  const list: Rendition[] = [
    make("original", video ? "Original video" : "Original", "The untouched upload. Kept exactly as it was sent, for auditors.", original, asset.secure_url),
    make("thumb", video ? "Poster frame" : "Grid preview", video ? "A still frame pulled from the video, sized for the photo grid." : "Square preview for the photo grid. Format and quality picked automatically per browser.", "240×240", thumbUrl(asset.secure_url, asset.resource_type)),
    make("blur", "Loading placeholder", "A tiny blurred copy, under 1 KB, shown while the real photo loads.", "24×24", blurUrl(asset.secure_url, asset.resource_type)),
  ]
  if (video) return list

  list.push(
    make("slide", "Before / after frame", "The same 4:3 crop for every photo, so before and after line up in the slider.", "800×600", slideUrl(asset.secure_url)),
    make("report", "Donor report copy", "Faces hidden automatically for the PDF report. The original is not changed.", "400×300", reportThumbUrl(asset.secure_url)),
    make("enhanced", "AI-enhanced copy", "Light and colour improved by Cloudinary AI, faces hidden. For campaigns only: evidence keeps the original.", "800 px", enhanceCompare(asset.secure_url).after),
  )
  // Campaign cards only ever use verified photos, so only show them for one.
  const verified = asset.review_status !== "rejected" && (asset.review_status === "approved" || (asset.trust_score ?? -1) >= VERIFIED_SCORE)
  if (verified) {
    const card = { cloud: opts.cloud, hero: { publicId: asset.public_id }, headline: "Verified field evidence", subline: opts.projectName ?? "Overlook" }
    list.push(
      make("instagram", "Instagram post", "Square post with faces hidden and the headline written on by Cloudinary.", "1080×1080", cardUrl({ ...card, kind: "instagram" })),
      make("story", "WhatsApp / story", "Tall phone format with faces hidden, made from the same photo.", "1080×1920", cardUrl({ ...card, kind: "story" })),
    )
  }
  return list
}
