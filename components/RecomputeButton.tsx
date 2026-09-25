"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function RecomputeButton() {
  const router = useRouter()
  const [note, setNote] = useState("")

  async function run() {
    setNote("Working…")
    const res = await fetch("/api/trust/recompute", { method: "POST" })
    const body = await res.json()
    setNote(res.ok ? `Recomputed ${body.recomputed} assets (no AI credits used).` : body.error)
    router.refresh()
  }

  return (
    <span className="text-sm">
      <Button onClick={run}>Recompute all trust scores</Button> {note}
    </span>
  )
}
