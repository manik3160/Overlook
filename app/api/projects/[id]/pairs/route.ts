import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { findPairs, type PairCandidate } from "@/lib/pairing"
import { splitPhases } from "@/lib/signals"
import { loadEvidence, toCandidate } from "@/lib/project-data"

// (Re)computes this project's before/after pairs. Existing pairs that are still valid keep their summaries.
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/pairs">) {
  const { id } = await ctx.params
  const { rows } = await loadEvidence(id)
  const phases = splitPhases(rows)
  if (!phases) return NextResponse.json({ pairs: 0, reason: "Need photos taken at least 3 days apart to form before/after sets." })

  const candidates = (set: Set<string>) => rows.filter((r) => set.has(r.id) && r.resource_type === "image").map(toCandidate).filter((c): c is PairCandidate => c !== null)
  const pairs = findPairs(candidates(phases.before), candidates(phases.after))

  const { data: existing } = await supabase.from("pairs").select("id, before_asset_id, after_asset_id").eq("project_id", id)
  const key = (b: string, a: string) => `${b}>${a}`
  const wanted = new Map(pairs.map((p) => [key(p.beforeId, p.afterId), p]))
  const have = new Set((existing ?? []).map((e) => key(e.before_asset_id, e.after_asset_id)))

  const stale = (existing ?? []).filter((e) => !wanted.has(key(e.before_asset_id, e.after_asset_id))).map((e) => e.id)
  if (stale.length) await supabase.from("pairs").delete().in("id", stale)
  const fresh = pairs.filter((p) => !have.has(key(p.beforeId, p.afterId))).map((p) => ({ project_id: id, before_asset_id: p.beforeId, after_asset_id: p.afterId, distance_m: p.distanceM, days_apart: p.daysApart }))
  if (fresh.length) {
    const { error } = await supabase.from("pairs").insert(fresh)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ pairs: pairs.length, added: fresh.length, removed: stale.length })
}
