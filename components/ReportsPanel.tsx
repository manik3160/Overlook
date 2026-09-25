"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QrCode } from "lucide-react"
import CopyButton from "@/components/CopyButton"
import { Button } from "@/components/ui/button"
import { EmptyState, InlineNotice } from "@/components/ui/notice"

export type ReportListItem = { id: string; kind: string; sha: string; createdAt: string }

export default function ReportsPanel({ projectId, reports }: { projectId: string; reports: ReportListItem[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState("")
  const [note, setNote] = useState<{ tone: "neutral" | "success" | "error"; text: string } | null>(null)
  const [qr, setQr] = useState("")

  async function generate(kind: "donor" | "csr") {
    setBusy(kind)
    setNote({ tone: "neutral", text: "Building report and PDF. This can take up to a minute…" })
    try {
      const res = await fetch(`/api/projects/${projectId}/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) })
      const body = await res.json()
      setNote(res.ok ? { tone: "success", text: "Report ready." } : { tone: "error", text: body.error ?? "Report failed." })
    } catch (err) {
      setNote({ tone: "error", text: err instanceof Error ? err.message : "Report failed." })
    } finally {
      setBusy("")
      router.refresh()
    }
  }

  const link = "text-[13px] text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink"
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => generate("donor")} disabled={!!busy} aria-busy={busy === "donor" || undefined}>{busy === "donor" ? "Building PDF…" : "Generate donor PDF"}</Button>
        <Button size="sm" variant="outline" onClick={() => generate("csr")} disabled={!!busy} aria-busy={busy === "csr" || undefined}>{busy === "csr" ? "Building PDF…" : "Generate CSR PDF"}</Button>
      </div>
      {note && <InlineNotice tone={note.tone}>{note.text}</InlineNotice>}
      <p className="text-small text-fg-3 max-w-[68ch]">A report is a snapshot: scorecard, before/after pairs and an evidence table, sealed with a SHA-256 hash and a QR code to a public verification page. No AI calls are used.</p>
      {reports.length === 0 && !busy && <EmptyState title="No reports yet">Generate a donor or CSR PDF to seal the current evidence.</EmptyState>}
      {(reports.length > 0 || busy) && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr className="text-eyebrow border-b border-line"><th className="pb-2.5 pr-4 font-medium">Kind</th><th className="hidden pb-2.5 pr-4 font-medium sm:table-cell">Generated</th><th className="pb-2.5 pr-4 font-medium">SHA-256</th><th className="pb-2.5 pr-4 font-medium">PDF</th><th className="pb-2.5 font-medium">Verify</th></tr></thead>
            <tbody>
              {busy && <tr className="border-b border-line" aria-hidden="true"><td colSpan={5} className="py-3"><div className="skeleton h-5 w-2/3" /></td></tr>}
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-line align-top">
                  <td className="text-title py-3 pr-4">{r.kind}</td>
                  <td className="text-data hidden py-3 pr-4 text-fg-3 sm:table-cell">{r.createdAt}</td>
                  <td className="text-data whitespace-nowrap py-3 pr-4">{r.sha.slice(0, 8)}…{r.sha.slice(-8)}<CopyButton value={r.sha} label="Copy SHA-256" /></td>
                  <td className="py-3 pr-4"><a href={`/api/reports/${r.id}/pdf`} className={link} target="_blank" rel="noreferrer">Open ↗</a></td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-3">
                      <a href={`/verify/${r.id}`} className={link} target="_blank" rel="noreferrer">Public page ↗</a>
                      <button type="button" aria-label="Show verification link" aria-expanded={qr === r.id} onClick={() => setQr(qr === r.id ? "" : r.id)} className="text-fg-3 hover:text-fg"><QrCode size={16} strokeWidth={1.5} /></button>
                    </span>
                    {qr === r.id && (
                      <span className="mt-2 block rounded-md border border-line-strong bg-surface-1 p-3 shadow-[var(--shadow-pop)]">
                        <span className="text-small block">The QR code inside the PDF opens:</span>
                        <span className="text-hash block break-all">{typeof window === "undefined" ? "" : `${location.origin}/verify/${r.id}`}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
