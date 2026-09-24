// Square thumbnail via a Cloudinary transformation URL (works for images and video frames).
export function thumbUrl(secureUrl: string, resourceType: string): string {
  const url = secureUrl.replace("/upload/", "/upload/c_fill,w_240,h_240,f_auto,q_auto/")
  return resourceType === "video" ? url.replace(/\.[a-z0-9]+$/i, ".jpg") : url
}
