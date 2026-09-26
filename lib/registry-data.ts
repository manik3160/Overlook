import "server-only"
import { selectAll, supabase } from "@/lib/supabase"
import { findInRegistry, type RegistryPhoto } from "@/lib/registry"
import { formatDay } from "@/lib/dates"
import { trustBand } from "@/lib/trust"

export type RegistryHit = { kind: "exact" | "near"; distance: number; project: string; organization: string | null; firstUploaded: string; taken: string | null; trust: string; thumb: string }
export type RegistryAnswer = { found: boolean; firstSeen: RegistryHit | null; hits: RegistryHit[]; projects: number; searched: number }

type Row = RegistryPhoto & { secure_url: string; taken_at: string | null; trust_score: number | null; review_status: string }

// Looks a fingerprint up across every project. Answers with what a funder needs (where and when it was first
// used) and a face-pixelated thumbnail; never the original file.
export async function registryLookup(etag: string | null, phash: string | null): Promise<RegistryAnswer> {
  const [rows, projects] = await Promise.all([
    selectAll<Row>((from, to) => supabase.from("assets").select("id, etag, phash, project_id, created_at, parent_asset_id, secure_url, taken_at, trust_score, review_status").eq("resource_type", "image").order("id").range(from, to)),
    selectAll<{ id: string; name: string; organization?: string | null }>((from, to) => supabase.from("projects").select("*").order("id").range(from, to)),
  ])
  const byProject = new Map(projects.map((p) => [p.id, p]))
  const r = findInRegistry({ etag, phash }, rows)
  const hits = r.matches.map(({ photo, kind, distance }): RegistryHit => {
    const row = photo as Row
    const proj = row.project_id ? byProject.get(row.project_id) : undefined
    return {
      kind, distance,
      project: proj?.name ?? "an unassigned upload",
      organization: proj?.organization ?? null,
      firstUploaded: formatDay(row.created_at),
      taken: row.taken_at ? formatDay(row.taken_at) : null,
      trust: row.review_status === "rejected" ? "rejected by a reviewer" : row.trust_score === null ? "not scored" : `${trustBand(row.trust_score)} ${row.trust_score}`,
      thumb: row.secure_url.replace("/upload/", "/upload/e_pixelate_faces/c_fill,w_240,h_180,f_auto,q_auto/"),
    }
  })
  return { found: hits.length > 0, firstSeen: hits[0] ?? null, hits: hits.slice(0, 12), projects: r.projects, searched: rows.length }
}
