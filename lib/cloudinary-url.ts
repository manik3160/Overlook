// Square thumbnail via a Cloudinary transformation URL (works for images and video frames).
export function thumbUrl(secureUrl: string, resourceType: string): string {
  const url = secureUrl.replace("/upload/", "/upload/c_fill,w_240,h_240,f_auto,q_auto/")
  return resourceType === "video" ? url.replace(/\.[a-z0-9]+$/i, ".jpg") : url
}

// Same crop for before and after so the slider lines up.
export const slideUrl = (secureUrl: string) => secureUrl.replace("/upload/", "/upload/c_fill,w_800,h_600,f_auto,q_auto/")

// A ~24 px, heavily blurred copy of the same crop (well under 1 KB). Painted behind a tile so the grid never shows an
// empty box while the real thumbnail loads.
export function blurUrl(secureUrl: string, resourceType: string): string {
  const url = secureUrl.replace("/upload/", "/upload/c_fill,w_24,h_24,e_blur:300,q_30,f_auto/")
  return resourceType === "video" ? url.replace(/\.[a-z0-9]+$/i, ".jpg") : url
}

// Public copies: a separate stored file per verified photo with faces pixelated INSIDE the file (done once, on upload).
// Public pages point only at these, so removing a transformation from the URL can never reveal a face.
export const publicCopyId = (assetId: string) => `overlook/public/${assetId}`
export const publicCopyUrl = (cloud: string, assetId: string, transformation = "") =>
  `https://res.cloudinary.com/${cloud}/image/upload/${transformation ? `${transformation}/` : ""}${publicCopyId(assetId)}.jpg`

// Cloudinary AI video preview (e_preview): a short clip of the most interesting moments, for hovering a video tile.
export const videoPreviewUrl = (secureUrl: string, seconds = 4) =>
  secureUrl.replace("/upload/", `/upload/e_preview:duration_${seconds}/c_fill,w_240,h_240,q_auto/`).replace(/\.[a-z0-9]+$/i, ".mp4")
