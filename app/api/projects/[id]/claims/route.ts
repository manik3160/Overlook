import { after, NextResponse } from "next/server"
import { stampReport } from "@/lib/ots-server"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { extractClaims, matchClaimsToPhotos, type ClaimCandidate } from "@/lib/gemini"
import { searchAssets } from "@/lib/search"
import { manifestHash, sha256Hex } from "@/lib/manifest"
import { VERIFIED_SCORE } from "@/lib/signals"
import { RateLimitError } from "@/lib/errors"
import { judgeClaim, summarize, type ClaimMatch } from "@/lib/claims"

export const maxDuration = 60
const MAX_CANDIDATES = 150 // captions sent to the model in one call; bigger projects are narrowed by search first

// Checks the claims in a pasted report paragraph against this project's evidence. Gemini call 1 extracts the
// claims; call 2 says which photos directly show each one (from their captions/tags); lib/claims.ts decides. The result is a sealed 'claims'
// report (shareable /verify link); the same text is never checked twice (the stored result is returned).
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/claims">) {
  const { id } = await ctx.params
  const parsed = z.object({ text: z.string().trim().min(20, "Paste at least a sentence").max(3000, "Keep it under 3,000 characters") }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid text" }, { status: 400 })
  const text = parsed.data.text
  const inputHash = sha256Hex(text.replace(/\s+/g, " "))

  const { data: cached } = await supabase.from("reports").select("id").eq("project_id", id).eq("kind", "claims").eq("manifest->>input_sha256", inputHash).limit(1).maybeSingle()
  if (cached) return NextResponse.json({ reportId: cached.id, cached: true })
  const { data: project } = await supabase.from("projects").select("id, name").eq("id", id).maybeSingle()
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  try {
    const claims = await extractClaims(text)
    if (claims.length === 0) return NextResponse.json({ error: "No checkable claims found in that text." }, { status: 422 })
    const { data: pairs } = await supabase.from("pairs").select("before_asset_id, after_asset_id").eq("project_id", id)
    const inPair = new Set((pairs ?? []).flatMap((p) => [p.before_asset_id, p.after_asset_id]))

    // Candidates: analysed, non-rejected photos of this project (rejected ones are ignored entirely).
    const { data: rows, error: rowsError } = await supabase.from("assets")
      .select("id, public_id, secure_url, caption, tags, taken_at, trust_score, review_status")
      .eq("project_id", id).eq("resource_type", "image").neq("review_status", "rejected").not("caption", "is", null)
      .order("taken_at", { ascending: false }).limit(1000)
    if (rowsError) throw new Error(rowsError.message)
    let pool = rows ?? []
    if (pool.length > MAX_CANDIDATES) {
      const near = new Set<string>()
      for (const c of claims) for (const h of (await searchAssets({ q: c.subject, project: id, type: "image" })).hits) near.add(h.id)
      pool = pool.filter((r) => near.has(r.id)).slice(0, MAX_CANDIDATES)
    }
    const candidates: ClaimCandidate[] = pool.map((r) => ({ id: r.id, caption: r.caption!, tags: r.tags ?? [], date: r.taken_at?.slice(0, 10) ?? null }))
    const shown = candidates.length ? await matchClaimsToPhotos(claims, candidates) : new Map<number, string[]>()
    const byId = new Map(pool.map((r) => [r.id, r]))

    const results = claims.map((claim, i) => {
      const matches: ClaimMatch[] = (shown.get(i) ?? []).map((pid) => {
        const r = byId.get(pid)!
        return { id: pid, verified: r.review_status === "approved" || (r.trust_score ?? -1) >= VERIFIED_SCORE, time: r.taken_at ? Date.parse(r.taken_at) : null, inPair: inPair.has(pid) }
      })
      const verdict = judgeClaim(claim, matches)
      return { ...verdict, photos: verdict.photoIds.map((pid) => { const r = byId.get(pid)!; return { id: pid, public_id: r.public_id, secure_url: r.secure_url, trust_score: r.trust_score, taken_at: r.taken_at } }) }
    })

    const reportId = randomUUID()
    const manifest = {
      schema: "overlook-claims/1",
      check: { id: reportId, checked_at: new Date().toISOString(), meaning: "Each claim is compared with this project's VERIFIED photos (trust 80+ or approved), using the AI description and tags of each photo. 'No evidence found' means no photo shows it, not that it is false." },
      project: { id: project.id, name: project.name },
      input_text: text,
      input_sha256: inputHash,
      summary: summarize(results),
      results,
    }
    const { error } = await supabase.from("reports").insert({ id: reportId, project_id: id, kind: "claims", manifest, manifest_sha256: manifestHash(manifest) })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    after(() => stampReport(reportId))
    return NextResponse.json({ reportId, cached: false })
  } catch (err) {
    if (err instanceof RateLimitError) return NextResponse.json({ error: "The AI is rate limited right now; try again in a minute." }, { status: 429 })
    return NextResponse.json({ error: err instanceof Error ? err.message.slice(0, 200) : "Check failed" }, { status: 502 })
  }
}
