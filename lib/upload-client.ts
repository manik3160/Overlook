// Browser-only: signed direct upload to Cloudinary (the API secret never leaves the server).
// Shared by the bulk uploader and the field camera.
export type UploadResult = {
  public_id: string; asset_id: string; resource_type: string; secure_url: string; etag: string
  phash?: string; width: number; height: number
}

export async function uploadToCloudinary(file: Blob & { name?: string }, folder = "evidence/inbox"): Promise<UploadResult> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloud || !preset) throw new Error("Cloudinary env vars are missing")

  const params = { folder, phash: "true", timestamp: Math.round(Date.now() / 1000), upload_preset: preset }
  const signRes = await fetch("/api/sign-cloudinary-params", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paramsToSign: params }),
  })
  if (!signRes.ok) throw new Error((await signRes.json()).error ?? "signing failed")
  const { signature, apiKey } = await signRes.json()

  const form = new FormData()
  form.append("file", file)
  form.append("api_key", apiKey)
  form.append("signature", signature)
  for (const [k, v] of Object.entries(params)) form.append(k, String(v))

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: form })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error?.message ?? "upload failed")
  return body
}
