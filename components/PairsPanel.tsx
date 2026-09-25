"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import BeforeAfterSlider from "@/components/BeforeAfterSlider"

export type PairView = {
  id: string; beforeUrl: string; afterUrl: string; beforeLabel: string; afterLabel: string
  distanceM: number | null; daysApart: number | null; summary: string | null; beforeId: string; afterId: string
}

export default function PairsPanel({ projectId, pairs }: { projectId: string; pairs: PairView[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")

  async function run() {
    setBusy(true)
    setNote("Finding pairs…")
    try {
      const found = await (await fetch(`/api/projects/${projectId}/pairs`, { method: "POST" })).json()
      if (found.error) return setNote(found.error)
      if (found.reason) return setNote(found.reason)
      let remaining = 1
      while (remaining > 0) {
        setNote(`Writing change summaries…`)
        const res = await fetch(`/api/projects/${projectId}/pairs/summarize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 2 }) })
        const body = await res.json()
        if (!res.ok) return setNote(body.error ?? "summary request failed")
        if (body.failures?.length) return setNote(`Summary failed: ${body.failures[0]}`)
        remaining = body.remaining
        if (body.rateLimited) {
          setNote("Rate limited — waiting 30s…")
          await new Promise((r) => setTimeout(r, 30000))
        }
      }
      setNote(`${found.pairs} pair(s) ready.`)
    } finally {
      setBusy(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <Button onClick={run} disabled={busy}>{pairs.length ? "Refresh pairs" : "Find before/after pairs"}</Button> {note}
        <p>Pairs match a later photo to an earlier one within 50 m, at least 3 days apart. Summaries use the free Gemini tier.</p>
      </div>
      {pairs.length === 0 && <p className="text-sm">No pairs yet.</p>}
      <ul className="space-y-6">
        {pairs.map((p) => (
          <li key={p.id} className="space-y-1">
            <BeforeAfterSlider beforeUrl={p.beforeUrl} afterUrl={p.afterUrl} beforeLabel={p.beforeLabel} afterLabel={p.afterLabel} />
            <p className="max-w-xl text-sm">{p.summary ?? "Summary not written yet."}</p>
            <p className="text-xs">{p.daysApart} days apart · {p.distanceM} m apart</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
