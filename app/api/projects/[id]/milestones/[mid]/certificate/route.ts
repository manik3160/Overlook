import { after, NextResponse } from "next/server"
import { stampReport } from "@/lib/ots-server"
import { randomUUID } from "node:crypto"
import { supabase } from "@/lib/supabase"
import { manifestHash } from "@/lib/manifest"
import { loadMilestones } from "@/lib/milestones-data"

// Issues a sealed "ready to release" certificate for one payment stage: the rule, the evaluation and every
// photo behind it, hashed and verifiable on /verify/<id>. Refused unless the stage is ready right now.
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/milestones/[mid]/certificate">) {
  const { id, mid } = await ctx.params
  const data = await loadMilestones(id)
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  const status = data.statuses.find((s) => s.milestone.id === mid)
  if (!status) return NextResponse.json({ error: "Stage not found" }, { status: 404 })
  if (!status.ready) return NextResponse.json({ error: `Not ready yet: needs ${status.missing.join("; ")}` }, { status: 422 })

  const byId = new Map(data.rows.map((r) => [r.id, r]))
  const certId = randomUUID()
  const manifest = {
    schema: "overlook-milestone/1",
    certificate: { id: certId, issued_at: new Date().toISOString(), meaning: "The verified evidence this payment stage requires exists. A person still decides and releases the payment." },
    project: data.project,
    milestone: status.milestone,
    result: { ready: true, verified_photos: status.have, has_before_after_pair: status.hasPair, release_pct: status.milestone.releasePct },
    evidence: status.matchedIds.map((pid) => {
      const r = byId.get(pid)!
      return { public_id: r.public_id, secure_url: r.secure_url, trust_score: r.trust_score, review_status: r.review_status, taken_at: r.taken_at, lat: r.lat, lng: r.lng, captured_live: r.capture_proof?.verified === true, flags: (r.trust_flags ?? []).map((f) => f.code) }
    }).sort((a, b) => a.public_id.localeCompare(b.public_id)),
  }
  const { error } = await supabase.from("reports").insert({ id: certId, project_id: id, kind: "milestone", manifest, manifest_sha256: manifestHash(manifest) })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  after(() => stampReport(certId))
  return NextResponse.json({ certificateId: certId })
}
