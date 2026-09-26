import "server-only"
import { supabase } from "@/lib/supabase"
import { loadEvidence, type EvidenceRow } from "@/lib/project-data"
import { evaluateAll, milestonesSchema, releasablePct, type Milestone, type MilestoneStatus } from "@/lib/milestones"

export type ProjectMilestones = {
  project: { id: string; name: string; activity_type: string | null; start_date: string | null; end_date: string | null; center_lat: number | null; center_lng: number | null; radius_m: number | null }
  milestones: Milestone[]
  statuses: MilestoneStatus[]
  releasable: number
  certificates: Record<string, { id: string; issuedAt: string }> // latest certificate per stage id
  rows: EvidenceRow[]
}

// Loads a project's payment stages and evaluates them against its verified evidence right now.
export async function loadMilestones(projectId: string): Promise<ProjectMilestones | null> {
  // select("*") so pages still render if the 0003 migration has not been applied yet (milestones = []).
  const { data: p } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle()
  if (!p) return null
  const parsed = milestonesSchema.safeParse(p.milestones ?? [])
  const milestones = parsed.success ? parsed.data : []
  const [{ rows }, { data: pairs }, { data: certs }] = await Promise.all([
    loadEvidence(projectId),
    supabase.from("pairs").select("before_asset_id, after_asset_id").eq("project_id", projectId),
    supabase.from("reports").select("id, created_at, stage:manifest->milestone->>id").eq("project_id", projectId).eq("kind", "milestone").order("created_at", { ascending: false }),
  ])
  const statuses = evaluateAll(
    milestones,
    rows.map((r) => ({ id: r.id, time: r.time, tags: r.tags ?? [], trustScore: r.trust_score, reviewStatus: r.review_status, isImage: r.resource_type === "image" })),
    (pairs ?? []).map((x) => ({ beforeId: x.before_asset_id, afterId: x.after_asset_id })),
  )
  const certificates: ProjectMilestones["certificates"] = {}
  for (const c of (certs ?? []) as { id: string; created_at: string; stage: string | null }[]) {
    if (c.stage && !certificates[c.stage]) certificates[c.stage] = { id: c.id, issuedAt: c.created_at } // newest first
  }
  return {
    project: { id: p.id, name: p.name, activity_type: p.activity_type, start_date: p.start_date, end_date: p.end_date, center_lat: p.center_lat, center_lng: p.center_lng, radius_m: p.radius_m },
    milestones, statuses, releasable: releasablePct(statuses), certificates, rows,
  }
}
