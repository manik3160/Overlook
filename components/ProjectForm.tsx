"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, inputCls } from "@/components/ui/field"
import { InlineNotice } from "@/components/ui/notice"
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
    // Optional columns (migration 0004): only sent when filled in or being cleared, so the form keeps working without them.
    const organization = text(String(f.get("organization") ?? ""))
    const grant = num(String(f.get("grant_inr") ?? ""))
    const extra = {
      ...(organization !== null || initial.organization ? { organization } : {}),
      ...(grant !== null || initial.grant_inr != null ? { grant_inr: grant } : {}),
    }
    setBusy(true)
    setError("")
    const res = await fetch(mode === "create" ? "/api/projects" : `/api/projects/${projectId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...extra }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setError(json.error ?? "Something went wrong")
    if (mode === "create") router.push(`/projects/${json.project.id}`)
    else router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Name"><input name="name" required defaultValue={initial.name ?? ""} className={inputCls} /></Field>
      <Field label="Activity"><input name="activity_type" list="activities" defaultValue={initial.activity_type ?? ""} className={inputCls} /></Field>
      <datalist id="activities">{ACTIVITIES.map((a) => <option key={a} value={a} />)}</datalist>
      <Field label="Description"><input name="description" defaultValue={initial.description ?? ""} className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Organisation (NGO)"><input name="organization" defaultValue={initial.organization ?? ""} className={inputCls} /></Field>
        <Field label="Grant amount (₹)"><input name="grant_inr" type="number" min={0} step="any" defaultValue={initial.grant_inr ?? ""} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Centre latitude"><input name="center_lat" type="number" step="any" defaultValue={initial.center_lat ?? ""} className={inputCls} /></Field>
        <Field label="Centre longitude"><input name="center_lng" type="number" step="any" defaultValue={initial.center_lng ?? ""} className={inputCls} /></Field>
      </div>
      <Field label="Geofence radius (m)"><input name="radius_m" type="number" defaultValue={initial.radius_m ?? 500} className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date"><input name="start_date" type="date" defaultValue={initial.start_date ?? ""} className={inputCls} /></Field>
        <Field label="End date"><input name="end_date" type="date" defaultValue={initial.end_date ?? ""} className={inputCls} /></Field>
      </div>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      <Button type="submit" size="lg" disabled={busy} aria-busy={busy || undefined}>{busy ? "Saving…" : submitLabel}</Button>
    </form>
  )
}
