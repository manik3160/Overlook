"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"

export default function RecomputeButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  async function run() {
    setBusy(true)
    setNote(null)
    const res = await fetch("/api/trust/recompute", { method: "POST" })
    const body = await res.json()
    setBusy(false)
    setNote(res.ok ? { tone: "success", text: `Recomputed ${body.recomputed} assets. No AI credits used.` } : { tone: "error", text: body.error })
    router.refresh()
  }

  return (
    <div className="grid justify-items-end gap-2">
      <Button variant="ghost" onClick={run} disabled={busy} aria-busy={busy || undefined}>{busy ? "Working…" : "Recompute all trust scores"}</Button>
      {note && <InlineNotice tone={note.tone} className="max-w-sm">{note.text}</InlineNotice>}
    </div>
  )
}
