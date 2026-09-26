import "server-only"
import { selectAll, supabase } from "@/lib/supabase"
import { canonicalJson } from "@/lib/manifest"
import { computeTrust, type TrustAsset, type TrustChecks, type TrustFlag, type TrustProject, type TrustProvenance } from "@/lib/trust"

type Row = Omit<TrustAsset, "captured_live" | "device" | "org"> & { capture_proof: { verified?: boolean; deviceId?: string } | null; status: string; tags: string[] | null; caption: string | null; resource_type: string; trust_score: number | null; trust_flags: TrustFlag[] | null }

const ROW_COLS = "id, created_at, etag, phash, project_id, parent_asset_id, lat, lng, taken_at, has_exif, status, tags, caption, resource_type, trust_score, trust_flags, capture_proof"
const UPDATE_CONCURRENCY = 10

// Runs `fn` over `items` with at most `limit` in flight (plain Promise pool, no dependency).
async function inParallel<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < items.length) await fn(items[next++])
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

// Recomputes trust for the given assets (or all when omitted). Pure math + paged reads;
// no paid API calls. Called after upload, after analysis, and whenever project membership/settings change.
// Every read is paged (Supabase caps a request at 1,000 rows) so duplicate checks see the whole collection.
export async function recomputeTrust(ids?: string[]): Promise<number> {
  if (ids && ids.length === 0) return 0
  const [rows, projects, analyses, provenance] = await Promise.all([
    selectAll<Row>((from, to) => supabase.from("assets").select(ROW_COLS).order("id").range(from, to)),
    // "*" so this keeps working before migration 0004 adds projects.organization
    selectAll<TrustProject & { id: string; organization?: string | null }>((from, to) => supabase.from("projects").select("*").order("id").range(from, to)),
    // only the moderation answers, not the whole cached Gemini result
    selectAll<{ asset_id: string; checks: TrustChecks | null }>((from, to) =>
      supabase.from("analyses").select("asset_id, checks:result->checks").eq("kind", "gemini_analysis").order("id").range(from, to).overrideTypes<{ asset_id: string; checks: TrustChecks | null }[], { merge: false }>(),
    ),
    selectAll<{ asset_id: string; result: TrustProvenance }>((from, to) =>
      supabase.from("analyses").select("asset_id, result").eq("kind", "provenance").order("id").range(from, to).overrideTypes<{ asset_id: string; result: TrustProvenance }[], { merge: false }>(),
    ),
  ])
  const orgByProject = new Map(projects.map((p) => [p.id, p.organization ?? null]))
  const provenanceByAsset = new Map(provenance.map((p) => [p.asset_id, p.result]))
  // what the pure trust code sees for every asset: its organisation and, for live captures, the signing device
  const all = rows.map((r) => ({ ...r, org: r.project_id ? orgByProject.get(r.project_id) ?? null : null, device: r.capture_proof?.verified ? r.capture_proof.deviceId ?? null : null }))
  const projectById = new Map(projects.map((p) => [p.id, p]))
  const checksByAsset = new Map(analyses.map((a) => [a.asset_id, a.checks]))
  const idsByEtag = new Map<string, string[]>()
  for (const a of all) if (a.etag) idsByEtag.set(a.etag, [...(idsByEtag.get(a.etag) ?? []), a.id])

  // An exact duplicate is never AI-analysed itself (it copies its twin), so borrow the twin's answers.
  const checksFor = (a: (typeof all)[number]): TrustChecks | null =>
    checksByAsset.get(a.id) ?? (a.etag ? idsByEtag.get(a.etag) ?? [] : []).map((id) => checksByAsset.get(id)).find(Boolean) ?? null

  const wanted = ids ? new Set(ids) : null
  const targets = wanted ? all.filter((a) => wanted.has(a.id)) : all
  const changed: { id: string; score: number; flags: TrustFlag[] }[] = []
  for (const asset of targets) {
    const analysed = asset.status === "done"
    const result = computeTrust({
      asset: { ...asset, captured_live: asset.capture_proof?.verified === true },
      project: asset.project_id ? projectById.get(asset.project_id) ?? null : null,
      others: all, // computeTrust only compares against EARLIER uploads, so the asset itself never matches
      checks: checksFor(asset),
      provenance: provenanceByAsset.get(asset.id) ?? null,
      // videos have no tags: they are low-confidence only when nothing could be said about them (no transcript summary)
      lowConfidence: analysed && (asset.resource_type === "video" ? !asset.caption : (asset.tags ?? []).length === 0 || !asset.caption),
    })
    const same = asset.trust_score === result.score && canonicalJson(asset.trust_flags ?? []) === canonicalJson(result.flags) // jsonb reorders keys
    if (!same) changed.push({ id: asset.id, score: result.score, flags: result.flags })
  }

  await inParallel(changed, UPDATE_CONCURRENCY, async (c) => {
    const { error } = await supabase.from("assets").update({ trust_score: c.score, trust_flags: c.flags }).eq("id", c.id)
    if (error) throw new Error(error.message)
  })
  return targets.length
}

export async function recomputeProjectTrust(projectId: string): Promise<number> {
  const rows = await selectAll<{ id: string }>((from, to) => supabase.from("assets").select("id").eq("project_id", projectId).order("id").range(from, to))
  return recomputeTrust(rows.map((r) => r.id))
}
