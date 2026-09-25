"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"
import { Kbd } from "@/components/ui/layout"

// Approve / reject / undo. With `hotkeys`, A / R / U work anywhere except inside a text field.
export default function ReviewButtons({ assetId, current, hotkeys = false }: { assetId: string; current: string; hotkeys?: boolean }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function set(status: "approved" | "rejected" | "unreviewed") {
    setBusy(true)
    const res = await fetch(`/api/assets/${assetId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    setBusy(false)
    if (!res.ok) return setError((await res.json()).error ?? "failed")
    setError("")
    router.refresh()
  }

  useEffect(() => {
    if (!hotkeys) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]") || e.metaKey || e.ctrlKey || busy) return
      const k = e.key.toLowerCase()
      if (k === "a" && current !== "approved") void set("approved")
      else if (k === "r" && current !== "rejected") void set("rejected")
      else if (k === "u" && current !== "unreviewed") void set("unreviewed")
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `set` only closes over stable values
  }, [hotkeys, current, busy])

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="approve" onClick={() => set("approved")} disabled={current === "approved" || busy}><Check size={14} strokeWidth={2} />Approve{hotkeys && <Kbd>A</Kbd>}</Button>
        <Button variant="reject" onClick={() => set("rejected")} disabled={current === "rejected" || busy}><X size={14} strokeWidth={2} />Reject{hotkeys && <Kbd>R</Kbd>}</Button>
        {current !== "unreviewed" && <Button variant="ghost" onClick={() => set("unreviewed")} disabled={busy}>Undo{hotkeys && <Kbd>U</Kbd>}</Button>}
      </div>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
    </div>
  )
}
