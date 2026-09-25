import "server-only"
import { supabase } from "@/lib/supabase"
import type { PairCandidate } from "@/lib/pairing"
import type { ScoreAsset, Signals } from "@/lib/signals"

export type EvidenceRow = ScoreAsset & {
  public_id: string; etag: string | null; phash: string | null; trust_flags: { code: string; severity: string; reason: string }[] | null
  secure_url: string; resource_type: string; caption: string | null; tags: string[] | null
  taken_at: string | null; created_at: string; lat: number | null; lng: number | null; embedding: number[] | null
}

const parseVector = (v: unknown): number[] | null => (typeof v === "string" ? (JSON.parse(v) as number[]) : Array.isArray(v) ? (v as number[]) : null)

// The project's photos as scorecard inputs. Rejected photos are excluded from every metric.
export async function loadEvidence(projectId: string): Promise<{ rows: EvidenceRow[]; rejected: number }> {
  const { data, error } = await supabase
    .from("assets")
    .select("id, public_id, etag, phash, trust_flags, secure_url, resource_type, caption, tags, taken_at, created_at, lat, lng, embedding, status, signals, trust_score, review_status")
    .eq("project_id", projectId)
  if (error) throw new Error(error.message)
  const all = data ?? []
  const rows = all
    .filter((a) => a.review_status !== "rejected")
    .map((a): EvidenceRow => ({
      ...a,
      time: a.taken_at ? Date.parse(a.taken_at) : null,
      signals: (a.signals ?? null) as Signals | null,
      embedding: parseVector(a.embedding),
    }))
  return { rows, rejected: all.length - rows.length }
}

// Only geotagged, timed photos can be paired.
export const toCandidate = (r: EvidenceRow): PairCandidate | null =>
  r.lat !== null && r.lng !== null && r.time !== null ? { id: r.id, lat: r.lat, lng: r.lng, time: r.time, embedding: r.embedding } : null
