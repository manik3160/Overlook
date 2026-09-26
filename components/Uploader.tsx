"use client"

import { useEffect, useState } from "react"
import { ArrowUpFromLine, Check, Circle, Loader, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { readExif } from "@/lib/exif"
import { uploadToCloudinary } from "@/lib/upload-client"

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // Cloudinary free plan rejects images over 10 MB (media_limits.image_max_size_bytes); CLAUDE.md said 15
const MAX_VIDEO_BYTES = 100 * 1024 * 1024
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"]
const VIDEO_EXT = ["mp4", "mov", "webm"]
const ACCEPT = [...IMAGE_EXT, ...VIDEO_EXT].map((e) => `.${e}`).join(",")
const PARALLEL_UPLOADS = 3
// Fired on window when a batch finishes, so the analysis panel can refresh its counts (and auto-start).
export const UPLOADED_EVENT = "overlook:uploaded"

type Row = { name: string; state: "queued" | "uploading" | "done" | "rejected" | "failed"; note?: string; meta?: string }

const midEllipsis = (name: string, max = 30) => {
  if (name.length <= max) return name
  const keep = max - 1
  return `${name.slice(0, Math.ceil(keep / 2))}…${name.slice(name.length - Math.floor(keep / 2))}`
}

// Returns a rejection reason, or null if the file is acceptable.
function validate(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const isVideo = VIDEO_EXT.includes(ext)
  if (!isVideo && !IMAGE_EXT.includes(ext)) return `.${ext} is not supported (use jpg, png, webp, heic, mp4, mov, webm)`
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > max) return `too large (${(file.size / 1048576).toFixed(1)} MB; max ${max / 1048576} MB)`
  return null
}

const metaLabel = (e: { lat: number | null; lng: number | null; takenAt: string | null }) => {
  const gps = e.lat !== null && e.lng !== null
  return gps && e.takenAt ? "GPS · time" : gps ? "GPS only" : e.takenAt ? "Time only" : "No metadata"
}

function StateIcon({ state }: { state: Row["state"] }) {
  if (state === "uploading") return <Loader size={14} strokeWidth={1.5} className="animate-spin text-accent-ink" aria-label="Uploading" />
  if (state === "done") return <Check size={14} strokeWidth={2} className="text-verified" aria-label="Uploaded" />
  if (state === "rejected" || state === "failed") return <X size={14} strokeWidth={2} className="text-suspicious" aria-label={state === "failed" ? "Failed" : "Rejected"} />
  return <Circle size={12} strokeWidth={1.5} className="text-fg-3" aria-label="Queued" />
}

export default function Uploader() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function uploadOne(i: number, file: File) {
    update(i, { state: "uploading" })
    try {
      const exif = await readExif(file)
      update(i, { meta: metaLabel(exif) })
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
      return true
    } catch (err) {
      update(i, { state: "failed", note: err instanceof Error ? err.message : String(err) })
      return false
    }
  }

  async function handleFiles(files: File[]) {
    setCollapsed(false)
    setBusy(true)
    setRows(files.map((f) => ({ name: f.name, state: "queued" })))
    const valid: number[] = []
    files.forEach((file, i) => {
      const problem = validate(file)
      if (problem) update(i, { state: "rejected", note: problem })
      else valid.push(i)
    })
    // A few uploads in flight at once; files still start in the order they were picked.
    let next = 0
    let uploaded = 0
    const worker = async () => {
      while (next < valid.length) {
        const i = valid[next++]
        if (await uploadOne(i, files[i])) uploaded++
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALLEL_UPLOADS, valid.length) }, worker))
    setBusy(false)
    if (uploaded > 0) window.dispatchEvent(new CustomEvent(UPLOADED_EVENT, { detail: { uploaded } }))
    router.refresh()
  }

  // The queue folds down to its summary 4 s after a batch finishes.
  useEffect(() => {
    if (busy || rows.length === 0) return
    const t = setTimeout(() => setCollapsed(true), 4000)
    return () => clearTimeout(t)
  }, [busy, rows.length])

  const count = (s: Row["state"]) => rows.filter((r) => r.state === s).length
  const summary = `${count("done")} uploaded${count("rejected") ? ` · ${count("rejected")} rejected` : ""}${count("failed") ? ` · ${count("failed")} failed` : ""}${busy ? ` · ${count("queued") + count("uploading")} to go` : ""}`

  function pick(files: File[]) {
    if (files.length) void handleFiles(files)
  }

  return (
    <div className="grid gap-4">
      <input
        id="file-input"
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => {
          pick(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
        className="sr-only"
      />
      <label
        htmlFor="file-input"
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(Array.from(e.dataTransfer.files)) }}
        className={cn(
          "grid min-h-40 cursor-pointer content-center justify-items-start gap-2 rounded-md border px-6 py-6 transition-colors duration-[120ms] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-ink has-[:focus-visible]:outline-2",
          dragging ? "border-solid border-accent-ink bg-accent-tint" : "border-dashed border-line-strong bg-surface-1 hover:border-fg-3"
        )}
      >
        <ArrowUpFromLine size={20} strokeWidth={1.5} className="text-fg-3" aria-hidden="true" />
        <span className="text-title">{dragging ? "Release to upload" : "Drop field photos and videos here, or choose files"}</span>
        <span className="text-data text-fg-3">JPG · PNG · WEBP · HEIC up to 10 MB &nbsp; MP4 · MOV · WEBM up to 100 MB</span>
        <span className="text-small">Location and time are read from each file before it leaves your device.</span>
      </label>

      {rows.length > 0 && (
        <div className="grid gap-1" aria-live="polite">
          <p className="text-data text-fg-2">{summary}</p>
          {!collapsed && (
            <ul className="grid list-none border-t border-line p-0">
              {rows.map((r, i) => (
                <li key={i} data-state={r.state} className="grid grid-cols-[20px_1fr] items-center gap-x-3 gap-y-0.5 border-b border-line py-2.5 sm:grid-cols-[20px_minmax(0,1fr)_auto]">
                  <StateIcon state={r.state} />
                  <span className="text-data truncate" title={r.name}>{midEllipsis(r.name)}</span>
                  {r.meta && <span className="text-data col-start-2 text-fg-3 sm:col-start-3">{r.meta}</span>}
                  {r.note && <span className="text-small col-start-2 text-suspicious sm:col-span-2">{r.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
