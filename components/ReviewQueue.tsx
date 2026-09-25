"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import FlagRow from "@/components/FlagRow"
import SampleSheet from "@/components/SampleSheet"
import { SAMPLE_CLEAR } from "@/components/landing/story-data"
import TrustBadge from "@/components/TrustBadge"
import { TileImage, type TileAsset } from "@/components/EvidenceTile"
import { tileState } from "@/components/evidence-state"
import { Button } from "@/components/ui/button"
import { Eyebrow, Kbd } from "@/components/ui/layout"
import { EmptyState, InlineNotice } from "@/components/ui/notice"
import type { TrustFlag } from "@/lib/trust"
import { cn } from "@/lib/utils"

export type ReviewRow = Omit<TileAsset, "trust_flags"> & { public_id: string; trust_flags: TrustFlag[] | null }
type Last = { row: ReviewRow; kind: "approved" | "rejected" }

const short = (id: string) => id.split("/").pop() ?? id
const byScore = (a: ReviewRow, b: ReviewRow) => (a.trust_score ?? 100) - (b.trust_score ?? 100)

export default function ReviewQueue({ initialWaiting, initialReviewed }: { initialWaiting: ReviewRow[]; initialReviewed: ReviewRow[] }) {
  const router = useRouter()
  const [waiting, setWaiting] = useState(initialWaiting)
  const [reviewed, setReviewed] = useState(initialReviewed)
  const [cursor, setCursor] = useState(0)
  const [last, setLast] = useState<Last | null>(null)
  const [error, setError] = useState("")
  const [announce, setAnnounce] = useState("")
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})

  const post = useCallback(async (id: string, status: "approved" | "rejected" | "unreviewed") => {
    const res = await fetch(`/api/assets/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    if (!res.ok) throw new Error((await res.json()).error ?? "failed")
  }, [])

  const decide = useCallback(async (row: ReviewRow, kind: "approved" | "rejected") => {
    setError("")
    const prevWaiting = waiting, prevReviewed = reviewed
    const next = waiting.filter((r) => r.id !== row.id)
    setWaiting(next)
    setReviewed([{ ...row, review_status: kind }, ...reviewed])
    setCursor((c) => Math.min(c, Math.max(0, next.length - 1)))
    setLast({ row, kind })
    setAnnounce(`${kind === "approved" ? "Approved" : "Rejected"} ${short(row.public_id)}. ${next.length} left.`)
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setLast(null), 6000)
    try {
      await post(row.id, kind)
      router.refresh()
    } catch (e) {
      setWaiting(prevWaiting); setReviewed(prevReviewed); setLast(null)
      setError(e instanceof Error ? e.message : "failed")
    }
  }, [waiting, reviewed, post, router])

  const undo = useCallback(async (row: ReviewRow) => {
    setError("")
    setReviewed((r) => r.filter((x) => x.id !== row.id))
    const restored = { ...row, review_status: "unreviewed" }
    setWaiting((w) => [...w, restored].sort(byScore))
    setLast(null)
    setAnnounce(`Undone. ${short(row.public_id)} is back in the queue.`)
    try {
      await post(row.id, "unreviewed")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed")
    }
  }, [post, router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]") || e.metaKey || e.ctrlKey) return
      const k = e.key.toLowerCase()
      const cur = waiting[cursor]
      if (k === "j") setCursor((c) => Math.min(waiting.length - 1, c + 1))
      else if (k === "k") setCursor((c) => Math.max(0, c - 1))
      else if (k === "a" && cur) void decide(cur, "approved")
      else if (k === "r" && cur) void decide(cur, "rejected")
      else if (k === "u" && last) void undo(last.row)
      else if (k === "enter" && cur && !(e.target as HTMLElement).closest("button,a")) router.push(`/assets/${cur.id}`)
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
  }, [waiting, cursor, last, decide, undo, router])

  useEffect(() => {
    const cur = waiting[cursor]
    if (cur) cardRefs.current[cur.id]?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }, [cursor, waiting])

  return (
    <div className="grid gap-12">
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      <section aria-labelledby="w-h" className="grid gap-5">
        <div className="grid gap-2"><Eyebrow>01 · Flagged for review</Eyebrow><h2 id="w-h" className="text-h2"><span>{waiting.length}</span> waiting · lowest score first</h2></div>
        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        {last && (
          <InlineNotice tone="success" action={<Button variant="ghost" size="sm" onClick={() => undo(last.row)}>Undo <Kbd>U</Kbd></Button>}>
            {last.kind === "approved" ? "Approved" : "Rejected"} <span className="font-mono">{short(last.row.public_id)}</span> · {waiting.length} left
          </InlineNotice>
        )}
        {waiting.length === 0 ? (
          <EmptyState visual={<SampleSheet frames={SAMPLE_CLEAR} cols={4} mode="clear" edgeTop={["Sample roll", "illustrative"]} legend="All clear" ariaLabel="Illustrative contact sheet where every sample photo has developed into colour and none are flagged." />} title="Nothing flagged for review">New flags appear here after upload and analysis. A clear queue looks like this: every frame developed, none marked.</EmptyState>
        ) : (
          <ul className="grid list-none gap-3 p-0">
            {waiting.map((a, i) => (
              <li key={a.id} ref={(el) => { cardRefs.current[a.id] = el }}
                className={cn("grid gap-4 rounded-md border border-line bg-surface-1 p-4 md:grid-cols-[200px_1fr] md:gap-5 md:p-5 rise-in", i === cursor && "bg-surface-2 shadow-[inset_2px_0_0_var(--accent-ink)]")}
                aria-current={i === cursor ? "true" : undefined} onClick={() => setCursor(i)}>
                <Link href={`/assets/${a.id}`} className="tile block" data-flagged={tileState(a).flagged || undefined} aria-label={`Open ${short(a.public_id)}`}>
                  <TileImage asset={a} sizeClass="aspect-[4/3] md:aspect-square" />
                </Link>
                <div className="grid min-w-0 content-start gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/assets/${a.id}`} className="text-data break-all hover:underline">{a.public_id}</Link>
                    <TrustBadge score={a.trust_score} reviewStatus={a.review_status} />
                  </div>
                  {(a.trust_flags ?? []).map((f, j) => <FlagRow key={j} flag={f} />)}
                  <div className="flex flex-wrap items-center gap-2 pt-1 max-md:[&>button]:h-11 max-md:[&>button]:flex-1">
                    <Button variant="approve" size="sm" onClick={() => decide(a, "approved")}><Check size={13} strokeWidth={2} />Approve <Kbd>A</Kbd></Button>
                    <Button variant="reject" size="sm" onClick={() => decide(a, "rejected")}><X size={13} strokeWidth={2} />Reject <Kbd>R</Kbd></Button>
                    <Link href={`/assets/${a.id}`} className="ml-auto text-[13px] text-accent-ink hover:underline max-md:ml-0">Open details →</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="group" open={reviewed.length > 0 && reviewed.length <= 3}>
        <summary className="flex cursor-pointer list-none items-center gap-3"><Eyebrow>{`02 · Reviewed (${reviewed.length})`}</Eyebrow><span className="text-fg-3 transition-transform group-open:rotate-90" aria-hidden="true">›</span></summary>
        <ul className="mt-5 grid list-none gap-2 p-0">
          {reviewed.length === 0 && <li className="text-small">Nothing reviewed yet.</li>}
          {reviewed.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-4 border-b border-line py-2.5">
              <Link href={`/assets/${a.id}`} className="tile block w-16" aria-label={`Open ${short(a.public_id)}`}><TileImage asset={a} bare /></Link>
              <Link href={`/assets/${a.id}`} className="text-data min-w-0 flex-1 truncate hover:underline">{short(a.public_id)}</Link>
              <TrustBadge score={a.trust_score} reviewStatus={a.review_status} />
              <Button variant="ghost" size="sm" onClick={() => undo(a)}>Undo</Button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
