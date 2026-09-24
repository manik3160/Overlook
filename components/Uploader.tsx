"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { readExif } from "@/lib/exif"

const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"]
const VIDEO_EXT = ["mp4", "mov", "webm"]
const ACCEPT = [...IMAGE_EXT, ...VIDEO_EXT].map((e) => `.${e}`).join(",")

type Row = { name: string; state: "queued" | "uploading" | "done" | "rejected" | "failed"; note?: string }

// Returns a rejection reason, or null if the file is acceptable.
function validate(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const isVideo = VIDEO_EXT.includes(ext)
  if (!isVideo && !IMAGE_EXT.includes(ext)) return `.${ext} is not supported (use jpg, png, webp, heic, mp4, mov, webm)`
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > max) return `too large (${(file.size / 1048576).toFixed(1)} MB; max ${max / 1048576} MB)`
  return null
}

async function uploadToCloudinary(file: File) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloud || !preset) throw new Error("Cloudinary env vars are missing")

  const params = { folder: "evidence/inbox", phash: "true", timestamp: Math.round(Date.now() / 1000), upload_preset: preset }
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

export default function Uploader() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function handleFiles(files: File[]) {
    setRows(files.map((f) => ({ name: f.name, state: "queued" })))
    for (const [i, file] of files.entries()) {
      const problem = validate(file)
      if (problem) {
        update(i, { state: "rejected", note: problem })
        continue
      }
      update(i, { state: "uploading" })
      try {
        const exif = await readExif(file)
        const up = await uploadToCloudinary(file)
        const save = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_id: up.public_id,
            asset_id: up.asset_id,
            resource_type: up.resource_type === "video" ? "video" : "image",
            secure_url: up.secure_url,
            etag: up.etag,
            phash: up.phash ?? null,
            width: up.width,
            height: up.height,
            taken_at: exif.takenAt,
            lat: exif.lat,
            lng: exif.lng,
            has_exif: exif.hasExif,
          }),
        })
        if (!save.ok) throw new Error((await save.json()).error ?? "saving failed")
        update(i, { state: "done" })
      } catch (err) {
        update(i, { state: "failed", note: err instanceof Error ? err.message : String(err) })
      }
    }
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <input
        id="file-input"
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) void handleFiles(files)
          e.target.value = ""
        }}
        className="hidden"
      />
      <Button onClick={() => document.getElementById("file-input")?.click()}>Upload photos / videos</Button>
      <p className="text-sm">Images up to 15 MB, videos up to 100 MB.</p>
      <ul className="text-sm">
        {rows.map((r, i) => (
          <li key={i} data-state={r.state}>
            {r.name}: {r.state}{r.note ? ` — ${r.note}` : ""}
          </li>
        ))}
      </ul>
    </div>
  )
}
