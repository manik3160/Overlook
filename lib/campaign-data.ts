import "server-only"
import { supabase } from "@/lib/supabase"
import { loadEvidence, type EvidenceRow } from "@/lib/project-data"
import { computeScorecard, isVerified, type Scorecard } from "@/lib/signals"
import { headline, pickBestPair, subline, topNumbers, type Bilingual } from "@/lib/story"

export type Campaign = {
  project: { id: string; name: string; activity_type: string | null; description: string | null; start_date: string | null; end_date: string | null }
  totalPhotos: number
  verifiedRows: EvidenceRow[]
  scorecard: Scorecard // computed from VERIFIED photos only
  headline: Bilingual
  subline: Bilingual
  numbers: { label: string; value: string }[]
  pair: { before: EvidenceRow; after: EvidenceRow; summary: string | null; distanceM: number | null } | null
  hero: EvidenceRow | null
}

// Everything campaign content may use: verified photos only (trust >= 80 or approved; rejected already excluded).
export async function loadCampaign(projectId: string): Promise<Campaign | null> {
  const { data: project } = await supabase.from("projects").select("id, name, activity_type, description, start_date, end_date").eq("id", projectId).maybeSingle()
  if (!project) return null
  const { rows } = await loadEvidence(projectId)
  const verifiedRows = rows.filter(isVerified)
  const scorecard = computeScorecard(verifiedRows)

  const trust = new Map(verifiedRows.map((r) => [r.id, r.trust_score ?? 100]))
  const { data: pairRows } = await supabase.from("pairs").select("before_asset_id, after_asset_id, distance_m, change_summary").eq("project_id", projectId)
  const best = pickBestPair((pairRows ?? []).map((p) => ({ beforeId: p.before_asset_id, afterId: p.after_asset_id, distanceM: p.distance_m })), trust)
  const byId = new Map(verifiedRows.map((r) => [r.id, r]))
  const pair = best && byId.get(best.beforeId) && byId.get(best.afterId)
    ? { before: byId.get(best.beforeId)!, after: byId.get(best.afterId)!, distanceM: best.distanceM, summary: (pairRows ?? []).find((p) => p.before_asset_id === best.beforeId && p.after_asset_id === best.afterId)?.change_summary ?? null }
    : null

  const images = verifiedRows.filter((r) => r.resource_type === "image").sort((a, b) => (b.trust_score ?? 0) - (a.trust_score ?? 0) || (b.time ?? 0) - (a.time ?? 0))
  return {
    project, totalPhotos: rows.length, verifiedRows, scorecard,
    headline: headline(scorecard, verifiedRows.length, project.name),
    subline: subline(project.name, verifiedRows.length),
    numbers: topNumbers(scorecard, verifiedRows.length),
    pair, hero: pair?.after ?? images[0] ?? null,
  }
}
