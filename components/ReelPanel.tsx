"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"

export type ReelView = { url: string; downloadUrl: string; seconds: number; generatedAt: string }

// Highlight reel: verified photos spliced into one video by Cloudinary (faces pixelated, no AI calls).
export default function ReelPanel({ projectId, reel }: { projectId: string; reel: ReelView | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/reel`, { method: "POST" })
      const body = await res.json()
      if (!res.ok) setError(body.error ?? "Could not build the reel")
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed")
    } finally {
      setBusy(false)
      router.refresh()
    }
  }

  return (
    <div className="grid gap-3">
      {reel && (
        <div className="grid gap-2">
          <video key={reel.url} src={reel.url} controls playsInline preload="metadata" width={360} height={360} className="border border-line bg-surface-2" />
          <span className="text-small text-fg-3">{reel.seconds} s · made {reel.generatedAt}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant={reel ? "outline" : "default"} onClick={generate} disabled={busy} aria-busy={busy || undefined}>
          {busy ? "Building reel…" : reel ? "Rebuild highlight reel" : "Build highlight reel"}
        </Button>
        {reel && <a href={reel.downloadUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>Download MP4</a>}
      </div>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      <p className="text-small text-fg-3">Title, best before/after pair, up to 4 more verified photos, closing number. Only verified photos (trust 80+ or approved); faces are pixelated. No AI credits.</p>
    </div>
  )
}
