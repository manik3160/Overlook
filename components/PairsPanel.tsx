"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EmptyState, InlineNotice } from "@/components/ui/notice"
import BeforeAfterSlider from "@/components/BeforeAfterSlider"

export type PairView = {
  id: string; beforeUrl: string; afterUrl: string; beforeLabel: string; afterLabel: string
  distanceM: number | null; daysApart: number | null; summary: string | null; beforeId: string; afterId: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function PairsPanel({ projectId, pairs }: { projectId: string; pairs: PairView[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ tone: "neutral" | "success" | "error"; text: string } | null>(null)
  const [all, setAll] = useState(false)

  async function run() {
    setBusy(true)
    setNote({ tone: "neutral", text: "Finding pairs…" })
    try {
      const found = await (await fetch(`/api/projects/${projectId}/pairs`, { method: "POST" })).json()
      if (found.error) return setNote({ tone: "error", text: found.error })
      if (found.reason) return setNote({ tone: "neutral", text: found.reason })
      let remaining = 1
      while (remaining > 0) {
        setNote({ tone: "neutral", text: "Writing change summaries…" })
        const res = await fetch(`/api/projects/${projectId}/pairs/summarize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 2 }) })
        const body = await res.json()
        if (!res.ok) return setNote({ tone: "error", text: body.error ?? "summary request failed" })
        if (body.failures?.length) return setNote({ tone: "error", text: `Summary failed: ${body.failures[0]}` })
        remaining = body.remaining
        if (body.rateLimited) {
          setNote({ tone: "neutral", text: "Rate limited: waiting 30 s, then continuing…" })
          await sleep(30000)
        }
      }
      setNote({ tone: "success", text: `${found.pairs} pair(s) ready.` })
    } finally {
      setBusy(false)
      router.refresh()
    }
  }

  const shown = all ? pairs : pairs.slice(0, 3)
  const explainer = "Pairs match a later photo to an earlier one within 50 m, at least 3 days apart. Summaries use the free Gemini tier."
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={pairs.length ? "outline" : "default"} size="sm" onClick={run} disabled={busy} aria-busy={busy || undefined}>{busy ? "Working…" : pairs.length ? "Refresh pairs" : "Find before/after pairs"}</Button>
        <p className="text-small text-fg-3">{explainer}</p>
      </div>
      {note && <InlineNotice tone={note.tone}>{note.text}</InlineNotice>}
      {pairs.length === 0 && <EmptyState title="No pairs yet">{explainer}</EmptyState>}
      <ul className="grid list-none gap-10 p-0">
        {shown.map((p, i) => (
          <li key={p.id} className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8"><BeforeAfterSlider beforeUrl={p.beforeUrl} afterUrl={p.afterUrl} beforeLabel={p.beforeLabel} afterLabel={p.afterLabel} nudge={i === 0} /></div>
            <div className="grid content-start gap-3.5 lg:col-span-4">
              <p className="text-data text-fg-3">{p.daysApart} days apart · {p.distanceM} m apart</p>
              {p.summary ? <p className="max-w-[62ch]">{p.summary}</p> : <p className="italic text-fg-3">Summary not written yet.</p>}
              <div className="flex flex-wrap gap-4 text-[13px]">
                <Link href={`/assets/${p.beforeId}`} className="text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink">Before photo ↗</Link>
                <Link href={`/assets/${p.afterId}`} className="text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink">After photo ↗</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {pairs.length > 3 && <div><Button variant="outline" size="sm" onClick={() => setAll((v) => !v)}>{all ? "Show fewer pairs" : `Show all ${pairs.length} pairs`}</Button></div>}
    </div>
  )
}
