"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CircleCheck, CircleDashed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { inputCls } from "@/components/ui/field"
import { InlineNotice } from "@/components/ui/notice"
import type { Milestone, MilestoneStatus } from "@/lib/milestones"

type Props = {
  projectId: string
  statuses: MilestoneStatus[]
  releasable: number
  certificates: Record<string, { id: string; issuedAt: string }>
  template: Milestone[]
  tagOptions: string[]
}

const newStage = (i: number): Milestone => ({ id: `stage-${Date.now().toString(36)}-${i}`, title: "", releasePct: 10, rule: { tags: [], minVerified: 3, from: null, to: null, needPair: false } })

// Pay-on-Proof: payment stages that become "ready to release" only when their verified evidence exists.
export default function MilestonesPanel({ projectId, statuses, releasable, certificates, template, tagOptions }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Milestone[]>(statuses.map((s) => s.milestone))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const total = draft.reduce((s, m) => s + (m.releasePct || 0), 0)
  const set = (i: number, patch: Partial<Milestone> | ((m: Milestone) => Milestone)) =>
    setDraft((d) => d.map((m, j) => (j === i ? (typeof patch === "function" ? patch(m) : { ...m, ...patch }) : m)))
  const setRule = (i: number, patch: Partial<Milestone["rule"]>) => set(i, (m) => ({ ...m, rule: { ...m.rule, ...patch } }))

  async function save() {
    setBusy("save"); setError(null)
    const res = await fetch(`/api/projects/${projectId}/milestones`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ milestones: draft }) })
    const body = await res.json()
    setBusy(null)
    if (!res.ok) return setError(body.error ?? "Could not save")
    setEditing(false)
    router.refresh()
  }

  async function certify(mid: string) {
    setBusy(mid); setError(null)
    const res = await fetch(`/api/projects/${projectId}/milestones/${mid}/certificate`, { method: "POST" })
    const body = await res.json()
    setBusy(null)
    if (!res.ok) return setError(body.error ?? "Could not issue the certificate")
    router.refresh()
  }

  if (editing) {
    return (
      <div className="grid gap-4">
        {draft.length === 0 && <p className="text-small">No stages yet. Start from the template or add one.</p>}
        {draft.map((m, i) => (
          <fieldset key={m.id} className="grid gap-3 border border-line p-4">
            <legend className="text-small px-1">Stage {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
              <label className="grid gap-1 text-small">Title<input className={inputCls} value={m.title} maxLength={80} onChange={(e) => set(i, { title: e.target.value })} /></label>
              <label className="grid gap-1 text-small">Release %<input className={inputCls} type="number" min={1} max={100} value={m.releasePct} onChange={(e) => set(i, { releasePct: Number(e.target.value) })} /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-small">Verified photos needed<input className={inputCls} type="number" min={1} value={m.rule.minVerified} onChange={(e) => setRule(i, { minVerified: Number(e.target.value) })} /></label>
              <label className="grid gap-1 text-small">Taken from<input className={inputCls} type="date" value={m.rule.from ?? ""} onChange={(e) => setRule(i, { from: e.target.value || null })} /></label>
              <label className="grid gap-1 text-small">Taken up to<input className={inputCls} type="date" value={m.rule.to ?? ""} onChange={(e) => setRule(i, { to: e.target.value || null })} /></label>
            </div>
            <div className="grid gap-1 text-small">
              Showing any of (none ticked = any photo)
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {tagOptions.map((t) => (
                  <label key={t} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={m.rule.tags.includes(t)} onChange={(e) => setRule(i, { tags: e.target.checked ? [...m.rule.tags, t] : m.rule.tags.filter((x) => x !== t) })} />
                    {t.replaceAll("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-small"><input type="checkbox" checked={m.rule.needPair} onChange={(e) => setRule(i, { needPair: e.target.checked })} />Also needs a before/after pair of the same spot</label>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>Remove stage</Button>
          </fieldset>
        ))}
        <p className={`text-small ${total > 100 ? "text-suspicious" : ""}`}>Stages add up to {total}% of the grant{total > 100 ? " (more than 100%)" : ""}.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={busy !== null}>{busy === "save" ? "Saving…" : "Save stages"}</Button>
          <Button size="sm" variant="outline" onClick={() => setDraft((d) => [...d, newStage(d.length)])}>Add stage</Button>
          <Button size="sm" variant="outline" onClick={() => setDraft(template)}>Use template</Button>
          <Button size="sm" variant="outline" onClick={() => { setDraft(statuses.map((s) => s.milestone)); setEditing(false); setError(null) }}>Cancel</Button>
        </div>
        {error && <InlineNotice tone="error">{error}</InlineNotice>}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {statuses.length === 0 ? (
        <p className="text-small">No payment stages yet. Stages turn &quot;ready to release&quot; only when their verified evidence exists.</p>
      ) : (
        <>
          <p><b className="font-semibold">{releasable}%</b> of the grant is ready to release · {statuses.filter((s) => s.ready).length} of {statuses.length} stages</p>
          <ol className="grid list-none gap-3 p-0">
            {statuses.map((s) => {
              const cert = certificates[s.milestone.id]
              return (
                <li key={s.milestone.id} className="grid gap-1.5 border-b border-line pb-3">
                  <p className="flex items-start gap-2">
                    {s.ready ? <CircleCheck size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-verified" aria-hidden="true" /> : <CircleDashed size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-3" aria-hidden="true" />}
                    <span><b className="font-semibold">{s.milestone.title}</b> · {s.milestone.releasePct}% · <span className={s.ready ? "text-verified" : "text-fg-2"}>{s.ready ? "Ready to release" : "Not ready yet"}</span></span>
                  </p>
                  <p className="text-small pl-[26px]">
                    {s.have} verified photo{s.have === 1 ? "" : "s"} of {s.milestone.rule.minVerified} needed{s.milestone.rule.needPair ? ` · before/after pair: ${s.hasPair ? "yes" : "no"}` : ""}
                    {s.missing.length > 0 && <> · Still needs {s.missing.join("; ")}. <Link href={`/capture/list?project=${projectId}`} className="text-accent-ink underline">Shot list</Link></>}
                  </p>
                  {s.ready && (
                    <div className="flex flex-wrap items-center gap-3 pl-[26px]">
                      <Button size="sm" variant={cert ? "outline" : "default"} onClick={() => certify(s.milestone.id)} disabled={busy !== null}>{busy === s.milestone.id ? "Sealing…" : cert ? "Issue a new certificate" : "Issue release certificate"}</Button>
                      {cert && <a href={`/verify/${cert.id}`} target="_blank" rel="noreferrer" className="text-[13px] text-accent-ink underline">Certificate ↗</a>}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { setDraft(statuses.length ? statuses.map((s) => s.milestone) : template); setEditing(true) }}>{statuses.length ? "Edit stages" : "Set up payment stages"}</Button>
      </div>
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      <p className="text-small text-fg-3">A certificate seals the rule, the result and every photo behind it (SHA-256, checkable on the verify page). It says the evidence exists; a person still decides and releases the payment.</p>
    </div>
  )
}
