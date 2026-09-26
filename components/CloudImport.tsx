"use client"

import { useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary"
import CloudinaryMark from "@/components/CloudinaryMark"
import { UPLOADED_EVENT } from "@/components/Uploader"
import { buttonVariants } from "@/components/ui/button"

// Follows the app's theme toggle (a "dark" class on <html>).
function subscribeTheme(onChange: () => void) {
  const obs = new MutationObserver(onChange)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => obs.disconnect()
}

type Info = { public_id: string; asset_id?: string; resource_type: string; secure_url: string; etag?: string; phash?: string; width?: number; height?: number }

// Second way in: Cloudinary's Upload Widget, for evidence that is not on this device (Google Drive, a web link, the
// camera). The browser never sees these files, so it sends NO location/time: the server asks Cloudinary to read the
// file's own metadata instead (lib/assets-db.ts), and the trust score treats it like any other upload.
// `apiKey` is Cloudinary's PUBLIC key (the widget needs it for signed uploads); the secret never leaves the server.
export default function CloudImport({ apiKey }: { apiKey: string }) {
  const router = useRouter()
  const [saved, setSaved] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  // The widget's first open loads Cloudinary's page (~10 s on a cold start): say so instead of looking frozen.
  const [opening, setOpening] = useState(false)
  // Cloudinary's widget is its own page (an iframe), so it gets the app's palette and font explicitly (globals.css tokens).
  const dark = useSyncExternalStore(subscribeTheme, () => document.documentElement.classList.contains("dark"), () => true)
  const palette = dark
    ? { window: "#141413", sourceBg: "#1B1B19", windowBorder: "#3A3A36", tabIcon: "#8FA7F2", inactiveTabIcon: "#85837B", menuIcons: "#A8A69E", link: "#8FA7F2", action: "#8FA7F2", inProgress: "#8FA7F2", complete: "#6FCF97", error: "#F2877B", textDark: "#0D0D0C", textLight: "#EDECE7" }
    : { window: "#FBFAF8", sourceBg: "#EFEEE9", windowBorder: "#C9C6BD", tabIcon: "#2F4FC4", inactiveTabIcon: "#6D6B64", menuIcons: "#52504A", link: "#2F4FC4", action: "#2F4FC4", inProgress: "#2F4FC4", complete: "#237A4B", error: "#B3261E", textDark: "#141412", textLight: "#FBFAF8" }

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
        key={dark ? "dark" : "light"} // the widget is built once, so rebuild it when the theme is known
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
          styles: { palette, fonts: { "'Funnel Sans', sans-serif": "https://fonts.googleapis.com/css2?family=Funnel+Sans:wght@400;600&display=swap" } },
        }}
        onSuccess={(result: CloudinaryUploadWidgetResults) => {
          if (result.info && typeof result.info === "object") void save(result.info as unknown as Info)
        }}
        onDisplayChanged={(r: CloudinaryUploadWidgetResults) => { if (r.info === "shown") setOpening(false) }}
        onQueuesEnd={() => {
          window.dispatchEvent(new CustomEvent(UPLOADED_EVENT, { detail: { uploaded: 1 } }))
          router.refresh()
        }}
      >
        {({ open }) => (
          <button
            type="button"
            disabled={opening}
            aria-busy={opening}
            onClick={() => { setOpening(true); open(); setTimeout(() => setOpening(false), 25_000) }}
            className={buttonVariants({ variant: "outline" }) + " w-fit"}
          >
            {opening ? <><span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent-ink" />Opening Cloudinary…</> : "Import from Google Drive, a link or camera"}
          </button>
        )}
      </CldUploadWidget>
      {saved > 0 && <p className="text-small" aria-live="polite">{saved} file{saved === 1 ? "" : "s"} imported. Location and time come from what Cloudinary read in each file.</p>}
      {errors.length > 0 && <p className="text-small text-suspicious">{errors.join("; ")}</p>}
    </div>
  )
}
