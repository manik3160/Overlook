import "server-only"
import { supabase } from "@/lib/supabase"
import { embedText } from "@/lib/gemini"
import { dayKey } from "@/lib/dates"
import { trustBand, type TrustBand } from "@/lib/trust"

export type SearchParams = { q?: string; project?: string; tag?: string; band?: string; from?: string; to?: string; type?: string }
export type SearchHit = {
  id: string; public_id: string; secure_url: string; resource_type: string; caption: string | null; tags: string[] | null
  trust_score: number | null; review_status: string; project_id: string | null; taken_at: string | null; created_at: string
  similarity: number | null
  parent_asset_id: string | null; frame_second: number | null; transcript: string | null
  status: string; trust_flags: { code: string; severity: string }[] | null // only used to draw the tile's develop state
  lat: number | null; lng: number | null
  transcriptMatch?: boolean
}
export type SearchOutcome = { hits: SearchHit[]; mode: "semantic" | "filters"; hidden: number }

// gemini-embedding-001 scores have a high baseline (unrelated text still scores ~0.7), so two rules apply:
// an absolute floor, and a margin below the best match. Calibrated on 8 queries x 6 photos: right photo
// always ranked #1 (0.78-0.88), nonsense queries topped out at 0.73. Phase 9 data pushed a nonsense query to 0.77,
// so the floor moved 0.75 -> 0.78. The gap is narrow (embeddings score everything ~0.7+): retune on real photos.
export const MIN_SIMILARITY = 0.78
export const MARGIN_BELOW_BEST = 0.06
const CANDIDATES = 100
const MAX_RESULTS = 40
const COLS = "id, public_id, secure_url, resource_type, caption, tags, trust_score, review_status, project_id, taken_at, created_at, parent_asset_id, frame_second, transcript, status, trust_flags, lat, lng"

// Query embeddings are cached in memory so repeating a search never calls Gemini twice.
const queryCache = new Map<string, number[]>()
async function embedQuery(q: string): Promise<number[]> {
  const key = q.trim().toLowerCase()
  const hit = queryCache.get(key)
  if (hit) return hit
  const vector = await embedText(key)
  if (queryCache.size >= 200) queryCache.delete(queryCache.keys().next().value!)
  queryCache.set(key, vector)
  return vector
}

const inBand = (score: number | null, band: string) => score !== null && trustBand(score) === (band as TrustBand)

function passesFilters(h: SearchHit, p: SearchParams): boolean {
  if (p.type && h.resource_type !== p.type) return false
  if (p.tag && !(h.tags ?? []).includes(p.tag)) return false
  if (p.band && !inBand(h.trust_score, p.band)) return false
  const day = dayKey(h.taken_at ?? h.created_at)
  if (p.from && day < p.from) return false
  if (p.to && day > p.to) return false
  return true
}

export async function searchAssets(p: SearchParams): Promise<SearchOutcome> {
  const q = p.q?.trim().slice(0, 300)

  if (!q) {
    let query = supabase.from("assets").select(COLS).order("created_at", { ascending: false }).limit(300)
    if (p.project) query = query.eq("project_id", p.project)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    const hits = ((data ?? []) as Omit<SearchHit, "similarity">[]).map((r): SearchHit => ({ ...r, similarity: null })).filter((h) => passesFilters(h, p))
    return { hits: hits.slice(0, MAX_RESULTS), mode: "filters", hidden: 0 }
  }

  // Exact words spoken in a video's transcript (ILIKE; % and _ escaped) always rank first.
  const like = q.replace(/[\\%_]/g, (c) => `\\${c}`)
  let kw = supabase.from("assets").select(COLS).ilike("transcript", `%${like}%`).limit(20)
  if (p.project) kw = kw.eq("project_id", p.project)
  const { data: kwRows } = await kw
  const keywordHits = ((kwRows ?? []) as Omit<SearchHit, "similarity">[]).map((r): SearchHit => ({ ...r, similarity: null, transcriptMatch: true })).filter((h) => passesFilters(h, p))

  const embedding = await embedQuery(q)
  const { data: matches, error } = await supabase.rpc("match_assets", {
    query_embedding: JSON.stringify(embedding),
    match_count: CANDIDATES,
    project_filter: p.project || null,
  })
  if (error) throw new Error(error.message)
  const similarity = new Map<string, number>((matches ?? []).map((m: { id: string; similarity: number }) => [m.id, m.similarity]))
  if (similarity.size === 0) return { hits: keywordHits.slice(0, MAX_RESULTS), mode: "semantic", hidden: 0 }

  const { data: rows, error: rowsError } = await supabase.from("assets").select(COLS).in("id", [...similarity.keys()])
  if (rowsError) throw new Error(rowsError.message)
  const filtered = ((rows ?? []) as Omit<SearchHit, "similarity">[])
    .map((r) => ({ ...r, similarity: similarity.get(r.id) ?? 0 }))
    .filter((h) => passesFilters(h, p))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
  const cutoff = Math.max(MIN_SIMILARITY, (filtered[0]?.similarity ?? 0) - MARGIN_BELOW_BEST)
  const relevant = filtered.filter((h) => (h.similarity ?? 0) >= cutoff)
  const seen = new Set(keywordHits.map((h) => h.id))
  return { hits: [...keywordHits, ...relevant.filter((h) => !seen.has(h.id))].slice(0, MAX_RESULTS), mode: "semantic", hidden: filtered.length - relevant.length }
}
