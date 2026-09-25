"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// Analyses just this one image (~650 AI Vision units), instead of the whole pending queue.
export default function AnalyzeOneButton({ assetId }: { assetId: string }) {
  const router = useRouter()
  const [note, setNote] = useState("")

  async function run() {
    setNote("Analyzing…")
    const res = await fetch("/api/analyze/next", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 1, ids: [assetId] }) })
    const body = await res.json()
    const r = body.results?.[0]
    setNote(!res.ok ? body.error : body.rateLimited ? "Rate limited, try again shortly." : r?.status === "failed" ? `Failed: ${r.error}` : "Done.")
    router.refresh()
  }

  return (
    <span className="text-sm">
      <Button onClick={run}>Analyze this image (uses ~650 AI Vision units)</Button> {note}
    </span>
  )
}
