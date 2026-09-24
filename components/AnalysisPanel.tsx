"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Counts = { total: number; pending: number; analyzing: number; done: number; failed: number }
type Result = { public_id: string; status: string; error?: string }

export default function AnalysisPanel({ initial }: { initial: Counts }) {
  const router = useRouter()
  const [counts, setCounts] = useState(initial)
  const [running, setRunning] = useState(false)
  const [note, setNote] = useState("")
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
          setNote(`Rate limited — waiting 30s. (${body.rateLimited.slice(0, 120)})`)
          await new Promise((r) => setTimeout(r, 30000))
          setNote("")
        } else if (body.counts.pending === 0) {
          break
        } else if (body.results.length > 0 && body.results.every((r: Result) => r.status === "failed")) {
          setNote("A whole batch failed — stopped to protect your credits. Check the errors below.")
          break
        }
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
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

  const finished = counts.done + counts.failed
  return (
    <div className="space-y-2 text-sm">
      <div>{counts.done} / {counts.total} analyzed · {counts.pending} pending · {counts.failed} failed</div>
      <progress value={finished} max={Math.max(counts.total, 1)} />
      <div className="flex gap-2">
        {running ? (
          <Button onClick={() => (stop.current = true)}>Stop after current batch</Button>
        ) : (
          <Button onClick={run} disabled={counts.pending === 0}>Analyze {counts.pending} pending</Button>
        )}
        <Button onClick={retry} disabled={running || counts.failed + counts.analyzing === 0}>Retry failed / stuck</Button>
      </div>
      {note && <p>{note}</p>}
      {errors.map((e, i) => <p key={i}>{e.public_id}: {e.error}</p>)}
    </div>
  )
}
