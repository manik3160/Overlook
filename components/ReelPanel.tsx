"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"

export type ReelView = { url: string; downloadUrl: string; seconds: number; generatedAt: string }

type Copy = { build: string; rebuild: string; busy: string; help: string }
const REEL_COPY: Copy = {
  build: "Build highlight reel", rebuild: "Rebuild highlight reel", busy: "Building reel…",
  help: "Title, best before/after pair, up to 4 more verified photos, closing number. Only verified photos (trust 80+ or approved); faces are pixelated. No AI credits.",
}

// A Cloudinary-spliced video of verified photos (faces pixelated, no AI calls): the project highlight reel,
// or (with `endpoint` + `copy`) the Ghost Camera time-lapse of one spot.
export default function ReelPanel({ endpoint, reel, copy = REEL_COPY }: { endpoint: string; reel: ReelView | null; copy?: Copy }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(endpoint, { method: "POST" })
      const body = await res.json()
      if (!res.ok) setError(body.error ?? "Could not build the video")
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
          {busy ? copy.busy : reel ? copy.rebuild : copy.build}
        </Button>
        {reel && <a href={reel.downloadUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>Download MP4</a>}
      </div>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      <p className="text-small text-fg-3">{copy.help}</p>
    </div>
  )
}
