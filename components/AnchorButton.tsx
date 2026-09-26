"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"

export default function AnchorButton({ reportId }: { reportId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function anchor() {
    setBusy(true); setError(null)
    const res = await fetch(`/api/reports/${reportId}/timestamp`, { method: "POST" })
    setBusy(false)
    if (!res.ok) return setError((await res.json()).error ?? "Could not anchor")
    router.refresh()
  }
  return (
    <div className="grid gap-2">
      <Button size="sm" variant="outline" className="w-fit" onClick={anchor} disabled={busy}>{busy ? "Anchoring…" : "Anchor this record in Bitcoin"}</Button>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
    </div>
  )
}
