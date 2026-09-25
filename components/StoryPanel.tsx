"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InlineNotice } from "@/components/ui/notice"

export default function StoryPanel({ projectId, hasStory }: { projectId: string; hasStory: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ tone: "neutral" | "success" | "error"; text: string } | null>(null)

  async function generate() {
    setBusy(true)
    setNote({ tone: "neutral", text: "Writing story from verified evidence…" })
    try {
      const res = await fetch(`/api/projects/${projectId}/story`, { method: "POST" })
      const body = await res.json()
      setNote(!res.ok ? { tone: "error", text: body.error } : body.source === "template" ? { tone: "neutral", text: `Story published from a template (AI unavailable: ${body.note}).` } : { tone: "success", text: "Story published." })
    } catch (err) {
      setNote({ tone: "error", text: err instanceof Error ? err.message : "failed" })
    } finally {
      setBusy(false)
      router.refresh()
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <Button size="sm" variant={hasStory ? "outline" : "default"} onClick={generate} disabled={busy} aria-busy={busy || undefined}>{busy ? "Writing…" : hasStory ? "Regenerate impact story" : "Generate impact story"}</Button>
        {hasStory && <a href={`/story/${projectId}`} className="text-[13px] text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink" target="_blank" rel="noreferrer">Open public story page ↗</a>}
      </div>
      {note && <InlineNotice tone={note.tone}>{note.text}</InlineNotice>}
      <p className="text-small text-fg-3">Uses one Gemini call and only photos that are verified (trust 80+ or approved). Faces are pixelated.</p>
    </div>
  )
}
