import "server-only"
import { supabase } from "@/lib/supabase"
import { loadEvidence } from "@/lib/project-data"
import { computeScorecard } from "@/lib/signals"
import { reportSlideUrl, reportThumbUrl, type ReportManifest } from "@/lib/manifest"
import { buildAnnex, type ComplianceInput } from "@/lib/compliance"
import { loadMilestones } from "@/lib/milestones-data"

const TITLES: Record<string, string> = { donor: "Donor impact evidence report", csr: "CSR impact evidence report" }

export async function buildReportManifest(projectId: string, kind: string, reportId: string, compliance?: ComplianceInput): Promise<ReportManifest | null> {
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle()
  if (!project) return null
  const { rows, rejected } = await loadEvidence(projectId)
  const byId = new Map(rows.map((r) => [r.id, r]))
  const { data: pairRows } = await supabase.from("pairs").select("before_asset_id, after_asset_id, distance_m, days_apart, change_summary").eq("project_id", projectId).order("created_at")

  const sorted = [...rows].sort((a, b) => (a.time ?? Date.parse(a.created_at)) - (b.time ?? Date.parse(b.created_at)) || a.public_id.localeCompare(b.public_id))
  const scorecard = computeScorecard(rows)
  const pay = compliance ? await loadMilestones(projectId) : null
  const annex = compliance
    ? buildAnnex(
        compliance,
        rows.map((r) => ({ trust_score: r.trust_score, review_status: r.review_status, lat: r.lat, lng: r.lng, taken_at: r.taken_at, flags: (r.trust_flags ?? []).map((f) => ({ code: f.code })) })),
        (pay?.statuses ?? []).map((s) => ({ title: s.milestone.title, release_pct: s.milestone.releasePct, ready: s.ready })),
      )
    : null
  return {
    schema: "overlook-report/1",
    report: { id: reportId, kind, title: TITLES[kind] ?? "Impact evidence report", generated_at: new Date().toISOString(), rejected_excluded: rejected },
    project: {
      id: project.id, name: project.name, description: project.description, activity_type: project.activity_type,
      center_lat: project.center_lat, center_lng: project.center_lng, radius_m: project.radius_m, start_date: project.start_date, end_date: project.end_date,
    },
    scorecard: {
      photos: scorecard.photos, analyzed: scorecard.analyzed, avgTrust: scorecard.avgTrust, verifiedPct: scorecard.verifiedPct, flaggedOrUnscored: scorecard.flaggedOrUnscored,
      phases: scorecard.phases && { gapDays: scorecard.phases.gapDays, beforeCount: scorecard.phases.beforeCount, afterCount: scorecard.phases.afterCount },
      rows: scorecard.rows,
    },
    pairs: (pairRows ?? []).flatMap((p) => {
      const b = byId.get(p.before_asset_id), a = byId.get(p.after_asset_id)
      if (!b || !a) return []
      return [{ before_public_id: b.public_id, after_public_id: a.public_id, before_report_url: reportSlideUrl(b.secure_url), after_report_url: reportSlideUrl(a.secure_url), days_apart: p.days_apart, distance_m: p.distance_m, change_summary: p.change_summary }]
    }),
    assets: sorted.map((r) => ({
      public_id: r.public_id, resource_type: r.resource_type, original_url: r.secure_url, report_url: reportThumbUrl(r.secure_url),
      trust_score: r.trust_score, review_status: r.review_status, taken_at: r.taken_at, lat: r.lat, lng: r.lng, etag: r.etag, phash: r.phash,
      flags: (r.trust_flags ?? []).map((f) => ({ code: f.code, severity: f.severity, reason: f.reason })),
    })),
    ...(annex ? { compliance: annex } : {}),
  }
}
