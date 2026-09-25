"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export type ReportListItem = { id: string; kind: string; sha: string; createdAt: string }

export default function ReportsPanel({ projectId, reports }: { projectId: string; reports: ReportListItem[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState("")
  const [note, setNote] = useState("")

  async function generate(kind: "donor" | "csr") {
    setBusy(kind)
    setNote("Building report and PDF (this can take up to a minute)…")
    try {
      const res = await fetch(`/api/projects/${projectId}/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) })
      const body = await res.json()
      setNote(res.ok ? "Report ready." : body.error ?? "Report failed.")
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Report failed.")
    } finally {
      setBusy("")
      router.refresh()
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => generate("donor")} disabled={!!busy}>Generate donor PDF</Button>
        <Button onClick={() => generate("csr")} disabled={!!busy}>Generate CSR PDF</Button>
        <span>{note}</span>
      </div>
      <p>A report is a snapshot: scorecard, before/after pairs and an evidence table, sealed with a SHA-256 hash and a QR code to a public verification page. No AI calls are used.</p>
      {reports.length === 0 && <p>No reports yet.</p>}
      <ul className="space-y-1">
        {reports.map((r) => (
          <li key={r.id}>
            {r.kind} · {r.createdAt} · <span className="font-mono text-xs">{r.sha.slice(0, 16)}…</span> ·{" "}
            <a href={`/api/reports/${r.id}/pdf`} className="underline" target="_blank" rel="noreferrer">PDF</a> ·{" "}
            <a href={`/verify/${r.id}`} className="underline" target="_blank" rel="noreferrer">Verification page</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
