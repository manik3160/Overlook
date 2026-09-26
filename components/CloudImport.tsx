"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary"
import CloudinaryMark from "@/components/CloudinaryMark"
import { UPLOADED_EVENT } from "@/components/Uploader"
import { buttonVariants } from "@/components/ui/button"

type Info = { public_id: string; asset_id?: string; resource_type: string; secure_url: string; etag?: string; phash?: string; width?: number; height?: number }

// Second way in: Cloudinary's Upload Widget, for evidence that is not on this device (Google Drive, a web link, the
// camera). The browser never sees these files, so it sends NO location/time: the server asks Cloudinary to read the
// file's own metadata instead (lib/assets-db.ts), and the trust score treats it like any other upload.
// `apiKey` is Cloudinary's PUBLIC key (the widget needs it for signed uploads); the secret never leaves the server.
export default function CloudImport({ apiKey }: { apiKey: string }) {
  const router = useRouter()
  const [saved, setSaved] = useState(0)
  const [errors, setErrors] = useState<string[]>([])

  async function save(info: Info) {
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_id: info.public_id, asset_id: info.asset_id, resource_type: info.resource_type === "video" ? "video" : "image",
        secure_url: info.secure_url, etag: info.etag, phash: info.phash ?? null, width: info.width, height: info.height,
        taken_at: null, lat: null, lng: null, has_exif: false,
      }),
    })
    if (res.ok) return setSaved((n) => n + 1)
    const message = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "saving failed"
    setErrors((e) => [...e, message])
  }

  return (
    <div className="grid gap-3 rounded-md border border-line bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-title">Or import from somewhere else</p>
        <CloudinaryMark says="Cloudinary's Upload Widget imports straight from Google Drive, a link or the camera, then reads each file's location and time itself" />
      </div>
      <p className="text-[14px] leading-6 text-fg-2">Google Drive, a web link or your camera. Cloudinary fetches the files and reads their location and time itself.</p>
      <CldUploadWidget
        signatureEndpoint="/api/sign-cloudinary-params"
        config={{ cloud: { cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, apiKey } }}
        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
        options={{
          sources: ["google_drive", "url", "camera", "local"],
          multiple: true,
          folder: "evidence/inbox",
          maxImageFileSize: 10 * 1024 * 1024, // Cloudinary free plan limit
          maxVideoFileSize: 100 * 1024 * 1024,
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "heic", "heif", "mp4", "mov", "webm"],
        }}
        onSuccess={(result: CloudinaryUploadWidgetResults) => {
          if (result.info && typeof result.info === "object") void save(result.info as unknown as Info)
        }}
        onQueuesEnd={() => {
          window.dispatchEvent(new CustomEvent(UPLOADED_EVENT, { detail: { uploaded: 1 } }))
          router.refresh()
        }}
      >
        {({ open }) => (
          <button type="button" onClick={() => open()} className={buttonVariants({ variant: "outline" }) + " w-fit"}>
            Import from Google Drive, a link or camera
          </button>
        )}
      </CldUploadWidget>
      {saved > 0 && <p className="text-small" aria-live="polite">{saved} file{saved === 1 ? "" : "s"} imported. Location and time come from what Cloudinary read in each file.</p>}
      {errors.length > 0 && <p className="text-small text-suspicious">{errors.join("; ")}</p>}
    </div>
  )
}
