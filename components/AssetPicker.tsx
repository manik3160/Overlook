"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import TrustBadge from "@/components/TrustBadge"

export type PickerAsset = { id: string; thumb: string; label: string; score?: number | null }
type Props = { projectId: string; action: "assign" | "unassign"; assets: PickerAsset[]; buttonLabel: string }

export default function AssetPicker({ projectId, action, assets, buttonLabel }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState("")

  async function submit() {
    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_ids: selected, action }),
    })
    if (!res.ok) return setError((await res.json()).error ?? "failed")
    setSelected([])
    setError("")
    router.refresh()
  }

  if (assets.length === 0) return <p className="text-sm">None.</p>
  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {assets.map((a) => (
          <li key={a.id} className="text-xs">
            <label>
              <input
                type="checkbox"
                checked={selected.includes(a.id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))}
              /> select
            </label>
            <Link href={`/assets/${a.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.thumb} alt="" width={120} height={120} />
            </Link>
            <div>{a.label}</div>
            {a.score !== undefined && <TrustBadge score={a.score} />}
          </li>
        ))}
      </ul>
      <Button onClick={submit} disabled={selected.length === 0}>{buttonLabel} ({selected.length})</Button>
      {error && <p role="alert" className="text-sm">{error}</p>}
    </div>
  )
}
