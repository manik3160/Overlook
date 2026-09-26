"use client"

import { useState } from "react"
import { InlineNotice } from "@/components/ui/notice"
import { uploadToCloudinary } from "@/lib/upload-client"
import type { RegistryAnswer } from "@/lib/registry-data"

type Answer = RegistryAnswer & { fingerprint: { md5: string | null; phash: string | null } }

export default function RegistryChecker() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function check(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) return setError("Choose a photo (JPG, PNG, WebP or HEIC).")
    if (file.size > 15 * 1024 * 1024) return setError("Photos up to 15 MB.")
    setBusy(true); setError(null); setAnswer(null); setPreview(URL.createObjectURL(file))
    try {
      const up = await uploadToCloudinary(file, "registry-checks")
      const res = await fetch("/api/registry/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ public_id: up.public_id }) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Check failed")
      setAnswer(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) void check(e.dataTransfer.files[0]) }}
        className={`grid min-h-36 cursor-pointer content-center justify-items-start gap-2 rounded-md border px-6 py-6 transition-colors duration-[120ms] ${dragging ? "border-solid border-accent-ink bg-accent-tint" : "border-dashed border-line-strong bg-surface-1 hover:border-fg-3"}`}
      >
        <span className="text-title">{busy ? "Checking…" : dragging ? "Release to check" : "Choose or drop a photo to check"}</span>
        <span className="text-small">Deleted right after the check.</span>
        <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { void check(e.target.files?.[0]); e.target.value = "" }} />
      </label>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {answer && (
        <div className="grid gap-4">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview && <img src={preview} alt="The photo you checked" className="h-24 w-32 object-cover" />}
            {answer.found && answer.firstSeen ? (
              <div className="grid gap-1">
                <p className="text-h2 !font-semibold text-review">Seen before</p>
                <p>First used in <b>{answer.firstSeen.project}</b>{answer.firstSeen.organization ? ` (${answer.firstSeen.organization})` : ""}, uploaded {answer.firstSeen.firstUploaded}{answer.firstSeen.taken ? `, taken ${answer.firstSeen.taken}` : ""}.</p>
                <p className="text-small">{answer.hits.length} match{answer.hits.length === 1 ? "" : "es"} in {answer.projects} project{answer.projects === 1 ? "" : "s"}, out of {answer.searched} photos checked.</p>
              </div>
            ) : (
              <div className="grid gap-1">
                <p className="text-h2 !font-semibold text-verified">Not seen before</p>
                <p className="text-small">No copy among the {answer.searched} photos in the registry. That is not proof it is original: it may exist outside Overlook.</p>
              </div>
            )}
          </div>
          {answer.found && (
            <ul className="grid list-none gap-3 p-0">
              {answer.hits.map((h, i) => (
                <li key={i} className="grid grid-cols-[96px_1fr] gap-3 border-b border-line pb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.thumb} alt="" className="h-[72px] w-[96px] object-cover" />
                  <div className="text-small grid gap-0.5">
                    <span className="text-fg">{h.kind === "exact" ? "Same file" : `Near-identical copy (${h.distance} bits apart)`} · {h.project}{h.organization ? ` (${h.organization})` : ""}</span>
                    <span>Uploaded {h.firstUploaded}{h.taken ? ` · taken ${h.taken}` : ""} · {h.trust}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-data break-all text-fg-3">MD5 {answer.fingerprint.md5 ?? "n/a"} · pHash {answer.fingerprint.phash ?? "n/a"}</p>
        </div>
      )}
    </div>
  )
}
