"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { Project } from "@/lib/project-schema"

type Initial = Partial<Omit<Project, "id">>
type Props = { mode: "create" | "edit"; projectId?: string; initial?: Initial; assetIds?: string[]; submitLabel: string }

const ACTIVITIES = ["cleanup", "plantation", "pond_restoration", "construction", "health_camp", "education"]
const num = (v: string) => (v.trim() === "" ? null : Number(v))
const text = (v: string) => (v.trim() === "" ? null : v.trim())

export default function ProjectForm({ mode, projectId, initial = {}, assetIds, submitLabel }: Props) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const body = {
      name: String(f.get("name")),
      activity_type: text(String(f.get("activity_type"))),
      description: text(String(f.get("description"))),
      center_lat: num(String(f.get("center_lat"))),
      center_lng: num(String(f.get("center_lng"))),
      radius_m: num(String(f.get("radius_m"))) ?? undefined,
      start_date: text(String(f.get("start_date"))),
      end_date: text(String(f.get("end_date"))),
      ...(mode === "create" && assetIds ? { asset_ids: assetIds } : {}),
    }
    setBusy(true)
    setError("")
    const res = await fetch(mode === "create" ? "/api/projects" : `/api/projects/${projectId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setError(json.error ?? "Something went wrong")
    if (mode === "create") router.push(`/projects/${json.project.id}`)
    else router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-2 text-sm">
      <label>Name <input name="name" required defaultValue={initial.name ?? ""} className="border p-1" /></label>
      <label>Activity <input name="activity_type" list="activities" defaultValue={initial.activity_type ?? ""} className="border p-1" /></label>
      <datalist id="activities">{ACTIVITIES.map((a) => <option key={a} value={a} />)}</datalist>
      <label>Description <input name="description" defaultValue={initial.description ?? ""} className="border p-1" /></label>
      <label>Center latitude <input name="center_lat" type="number" step="any" defaultValue={initial.center_lat ?? ""} className="border p-1" /></label>
      <label>Center longitude <input name="center_lng" type="number" step="any" defaultValue={initial.center_lng ?? ""} className="border p-1" /></label>
      <label>Geofence radius (m) <input name="radius_m" type="number" defaultValue={initial.radius_m ?? 500} className="border p-1" /></label>
      <label>Start date <input name="start_date" type="date" defaultValue={initial.start_date ?? ""} className="border p-1" /></label>
      <label>End date <input name="end_date" type="date" defaultValue={initial.end_date ?? ""} className="border p-1" /></label>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
    </form>
  )
}
