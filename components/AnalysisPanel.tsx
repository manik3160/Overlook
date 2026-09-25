"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"

type Counts = { total: number; pending: number; analyzing: number; done: number; failed: number }
type Result = { public_id: string; status: string; error?: string; id?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Analysis progress ledger (DESIGN.md 7.15). Logic is unchanged: the same batch loop, stop ref and retry route.
export default function AnalysisPanel({ initial }: { initial: Counts }) {
  const router = useRouter()
  const [counts, setCounts] = useState(initial)
  const [running, setRunning] = useState(false)
  const [note, setNote] = useState("")
  const [wait, setWait] = useState(0)
  const [errors, setErrors] = useState<Result[]>([])
  const stop = useRef(false)

  async function run() {
    stop.current = false
    setRunning(true)
    setNote("")
    try {
      while (!stop.current) {
        const res = await fetch("/api/analyze/next", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 2 }) })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? "analysis request failed")
        setCounts(body.counts)
        setErrors((prev) => [...prev, ...body.results.filter((r: Result) => r.status === "failed")])
        if (body.rateLimited) {
          setNote(`Rate limited (${String(body.rateLimited).slice(0, 100)})`)
          for (let s = 30; s > 0 && !stop.current; s--) { setWait(s); await sleep(1000) }
          setWait(0)
          setNote("")
        } else if (body.counts.pending === 0) {
          break
        } else if (body.results.length > 0 && body.results.every((r: Result) => r.status === "failed")) {
          setNote("A whole batch failed, so analysis stopped to protect your credits. Check the errors below.")
          break
        }
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
      setWait(0)
      router.refresh()
    }
  }

  async function retry() {
    const res = await fetch("/api/analyze/retry", { method: "POST" })
    const body = await res.json()
    if (res.ok) {
      setCounts(body.counts)
      setErrors([])
    }
  }

  const t = Math.max(counts.total, 1)
  const pct = (n: number) => `${(n / t) * 100}%`
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <p className="text-data-xl" aria-live="polite">{counts.done}<small className="ml-1 text-[0.5em] text-fg-3">/ {counts.total} analyzed</small></p>
      </div>
      <div className="flex h-2 gap-0.5 bg-surface-3" role="progressbar" aria-label="Analysis progress" aria-valuemin={0} aria-valuemax={counts.total} aria-valuenow={counts.done}>
        <i className="bg-fg transition-[width] duration-200" style={{ width: pct(counts.done) }} />
        <i className="bg-suspicious transition-[width] duration-200" style={{ width: pct(counts.failed) }} />
        <i className="bg-accent-ink transition-[width] duration-200" style={{ width: pct(counts.analyzing) }} />
      </div>
      <ul className="text-data flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-fg-2">
        <li className="flex items-center gap-2"><span className="size-2.5 rounded-[2px] bg-fg" />{counts.done} done</li>
        <li className="flex items-center gap-2"><span className="size-2.5 rounded-[2px] bg-suspicious" />{counts.failed} failed</li>
        <li className="flex items-center gap-2"><span className="size-2.5 rounded-[2px] border border-line-strong" />{counts.pending} pending</li>
      </ul>
      <div className="flex flex-wrap gap-2">
        {running ? (
          <Button variant="outline" onClick={() => (stop.current = true)}>Stop after current batch</Button>
        ) : (
          <Button onClick={run} disabled={counts.pending === 0}>Analyze {counts.pending} pending</Button>
        )}
        <Button variant="outline" onClick={retry} disabled={running || counts.failed + counts.analyzing === 0}>Retry failed / stuck</Button>
      </div>
      {running && !wait && <p className="text-small" aria-live="polite">Analyzing 2 photos at a time…</p>}
      {wait > 0 && <InlineNotice>Rate limited: retrying in {wait} s. This is normal on the free tier.</InlineNotice>}
      {note && !wait && <InlineNotice tone={note.startsWith("Rate limited") ? "neutral" : "error"}>{note}</InlineNotice>}
      {errors.length > 0 && (
        <details className="text-small">
          <summary className="cursor-pointer text-fg">{errors.length} failed</summary>
          <ul className="mt-2 grid list-none gap-1.5 p-0">
            {errors.map((e, i) => (
              <li key={i} className="text-data">{e.id ? <Link href={`/assets/${e.id}`} className="text-accent-ink hover:underline">{e.public_id}</Link> : e.public_id}: <span className="text-suspicious">{e.error}</span></li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-small text-fg-3">Cached: nothing is ever analyzed twice. About 650 AI Vision units per new photo.</p>
    </div>
  )
}
