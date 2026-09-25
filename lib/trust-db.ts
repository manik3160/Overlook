import "server-only"
import { supabase } from "@/lib/supabase"
import { computeTrust, type TrustAsset, type TrustChecks, type TrustProject } from "@/lib/trust"

type Row = TrustAsset & { status: string; tags: string[] | null; caption: string | null; resource_type: string }

// Recomputes trust for the given assets (or all when omitted). Pure math + a few small reads;
// no paid API calls. Called after upload, after analysis, and whenever project membership/settings change.
export async function recomputeTrust(ids?: string[]): Promise<number> {
  if (ids && ids.length === 0) return 0
  const [{ data: assets }, { data: projects }, { data: analyses }] = await Promise.all([
    supabase.from("assets").select("id, created_at, etag, phash, project_id, parent_asset_id, lat, lng, taken_at, has_exif, status, tags, caption, resource_type"),
    supabase.from("projects").select("id, center_lat, center_lng, radius_m, start_date, end_date"),
    supabase.from("analyses").select("asset_id, result").eq("kind", "gemini_analysis"),
  ])
  const all = (assets ?? []) as Row[]
  const projectById = new Map((projects ?? []).map((p) => [p.id as string, p as TrustProject]))
  const checksByAsset = new Map((analyses ?? []).map((a) => [a.asset_id as string, a.result.checks as TrustChecks]))
  const idsByEtag = new Map<string, string[]>()
  for (const a of all) if (a.etag) idsByEtag.set(a.etag, [...(idsByEtag.get(a.etag) ?? []), a.id])

  // An exact duplicate is never AI-analysed itself (it copies its twin), so borrow the twin's answers.
  const checksFor = (a: Row): TrustChecks | null =>
    checksByAsset.get(a.id) ?? (a.etag ? idsByEtag.get(a.etag) ?? [] : []).map((id) => checksByAsset.get(id)).find(Boolean) ?? null

  const targets = ids ? all.filter((a) => ids.includes(a.id)) : all
  for (const asset of targets) {
    const analysed = asset.status === "done"
    const result = computeTrust({
      asset,
      project: asset.project_id ? projectById.get(asset.project_id) ?? null : null,
      others: all.filter((o) => o.id !== asset.id),
      checks: checksFor(asset),
      // videos have no tags: they are low-confidence only when nothing could be said about them (no transcript summary)
      lowConfidence: analysed && (asset.resource_type === "video" ? !asset.caption : (asset.tags ?? []).length === 0 || !asset.caption),
    })
    await supabase.from("assets").update({ trust_score: result.score, trust_flags: result.flags }).eq("id", asset.id)
  }
  return targets.length
}

export async function recomputeProjectTrust(projectId: string): Promise<number> {
  const { data } = await supabase.from("assets").select("id").eq("project_id", projectId)
  return recomputeTrust((data ?? []).map((r) => r.id as string))
}
