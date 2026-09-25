"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function StoryPanel({ projectId, hasStory }: { projectId: string; hasStory: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")

  async function generate() {
    setBusy(true)
    setNote("Writing story from verified evidence…")
    try {
      const res = await fetch(`/api/projects/${projectId}/story`, { method: "POST" })
      const body = await res.json()
      setNote(!res.ok ? body.error : body.source === "template" ? `Story published from a template (AI unavailable: ${body.note}).` : "Story published.")
    } catch (err) {
      setNote(err instanceof Error ? err.message : "failed")
    } finally {
      setBusy(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-1 text-sm">
      <Button onClick={generate} disabled={busy}>{hasStory ? "Regenerate impact story" : "Generate impact story"}</Button> {note}
      {hasStory && <p><a href={`/story/${projectId}`} className="underline" target="_blank" rel="noreferrer">Open public story page</a></p>}
      <p>Uses one Gemini call and only photos that are verified (trust 80+ or approved).</p>
    </div>
  )
}
