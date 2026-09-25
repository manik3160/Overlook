"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EmptyState, InlineNotice } from "@/components/ui/notice"
import { TileImage, type TileAsset } from "@/components/EvidenceTile"
import TrustBadge from "@/components/TrustBadge"
import { tileState } from "@/components/evidence-state"
import { cn } from "@/lib/utils"

export type PickerAsset = { asset: TileAsset; label: string }
type Props = { projectId: string; action: "assign" | "unassign"; assets: PickerAsset[]; buttonLabel: string; emptyText?: string }

// Multi-select photo grid with a sticky action bar. Same API calls as before (assign / unassign).
export default function AssetPicker({ projectId, action, assets, buttonLabel, emptyText = "None." }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_ids: selected, action }),
    })
    setBusy(false)
    if (!res.ok) return setError((await res.json()).error ?? "failed")
    setSelected([])
    setError("")
    router.refresh()
  }

  if (assets.length === 0) return <EmptyState title={emptyText} />
  return (
    <div className="grid gap-4">
      <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-x-3 gap-y-5 p-0">
        {assets.map(({ asset: a, label }) => {
          const on = selected.includes(a.id)
          return (
            <li key={a.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5">
              <label className={cn("tile relative block cursor-pointer", on && "outline outline-2 outline-offset-2 outline-accent-ink")} data-flagged={tileState(a).flagged || undefined}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setSelected((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))}
                  className="absolute left-1.5 top-1.5 z-10 size-4 accent-[var(--fg)]"
                  aria-label={`Select ${a.caption ?? a.public_id ?? "photo"}`}
                />
                <TileImage asset={a} bare />
              </label>
              <span className="text-data text-fg-3">{label}</span>
              <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <TrustBadge score={a.trust_score} />
                <Link href={`/assets/${a.id}`} className="text-[12px] text-accent-ink hover:underline" aria-label="Open photo">Open</Link>
              </span>
            </li>
          )
        })}
      </ul>
      <div className={cn("sticky bottom-3 flex items-center justify-between gap-3 border border-line-strong bg-surface-1 px-4 py-3 shadow-[var(--shadow-pop)] transition-opacity", selected.length === 0 && "opacity-60")}>
        <span className="text-data">{selected.length} selected</span>
        <Button size="sm" onClick={submit} disabled={selected.length === 0 || busy} aria-busy={busy || undefined}>{buttonLabel} ({selected.length})</Button>
      </div>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
    </div>
  )
}
