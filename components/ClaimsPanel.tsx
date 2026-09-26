"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"

export type ClaimCheckView = { id: string; checkedAt: string; supported: number; partly: number; noEvidence: number; snippet: string }

// Claim Checker: paste a paragraph from an NGO report, see which claims the verified photos support.
export default function ClaimsPanel({ projectId, recent }: { projectId: string; recent: ClaimCheckView[] }) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function check() {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/claims`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
      const body = await res.json()
      if (!res.ok) return setError(body.error ?? "Check failed")
      router.push(`/verify/${body.reportId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-small">
        Paste text from an NGO or CSR report
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} rows={5} placeholder="In April our volunteers cleared debris from the camp site. By July the site was fully cleared and two new structures were complete…" className="w-full rounded-sm border border-line-strong bg-surface-2 p-3 text-sm text-fg" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={check} disabled={busy || text.trim().length < 20}>{busy ? "Checking claims…" : "Check claims against evidence"}</Button>
        <span className="text-small text-fg-3">One AI call to split the text, one search per claim. The same text is never checked twice.</span>
      </div>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {recent.length > 0 && (
        <ul className="grid list-none gap-1.5 p-0 text-small">
          {recent.map((r) => (
            <li key={r.id}>
              <Link href={`/verify/${r.id}`} className="text-accent-ink underline">{r.checkedAt}</Link> · {r.supported} supported · {r.partly} partly · {r.noEvidence} no evidence found · <span className="text-fg-3">“{r.snippet}…”</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
