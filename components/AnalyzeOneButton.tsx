"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"

// Analyses just this one image (~650 AI Vision units), never the whole pending queue. Never runs on its own.
export default function AnalyzeOneButton({ assetId }: { assetId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ tone: "neutral" | "success" | "error"; text: string } | null>(null)

  async function run() {
    setBusy(true)
    setNote({ tone: "neutral", text: "Analyzing…" })
    const res = await fetch("/api/analyze/next", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 1, ids: [assetId] }) })
    const body = await res.json()
    const r = body.results?.[0]
    setBusy(false)
    setNote(!res.ok ? { tone: "error", text: body.error } : body.rateLimited ? { tone: "neutral", text: "Rate limited, try again shortly." } : r?.status === "failed" ? { tone: "error", text: `Failed: ${r.error}` } : { tone: "success", text: "Done." })
    router.refresh()
  }

  return (
    <div className="grid justify-items-start gap-2">
      <Button variant="outline" onClick={run} disabled={busy} aria-busy={busy || undefined}>{busy ? "Analyzing…" : "Analyze this image"}</Button>
      <p className="text-small text-fg-3">Uses about 650 AI Vision units. Results are cached.</p>
      {note && <InlineNotice tone={note.tone}>{note.text}</InlineNotice>}
    </div>
  )
}
