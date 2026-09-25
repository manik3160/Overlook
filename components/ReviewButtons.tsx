"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function ReviewButtons({ assetId, current }: { assetId: string; current: string }) {
  const router = useRouter()
  const [error, setError] = useState("")

  async function set(status: "approved" | "rejected" | "unreviewed") {
    const res = await fetch(`/api/assets/${assetId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    if (!res.ok) return setError((await res.json()).error ?? "failed")
    setError("")
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Button onClick={() => set("approved")} disabled={current === "approved"}>Approve</Button>
      <Button onClick={() => set("rejected")} disabled={current === "rejected"}>Reject</Button>
      {current !== "unreviewed" && <Button onClick={() => set("unreviewed")}>Undo</Button>}
      {error && <span role="alert">{error}</span>}
    </div>
  )
}
