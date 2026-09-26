import "server-only"
import QRCode from "qrcode"
import { supabase } from "@/lib/supabase"
import { loadEvidence } from "@/lib/project-data"
import { splitPhases } from "@/lib/signals"
import { findGaps, type GapReport } from "@/lib/gaps"

export type ProjectGaps = GapReport & { project: { id: string; name: string }; ghostThumbs: Record<string, string> }

// Loads what findGaps (pure) needs for one project. Shared by the project page and the phone shot list.
export async function loadGaps(projectId: string): Promise<ProjectGaps | null> {
  const { data: p } = await supabase.from("projects").select("id, name, activity_type, center_lat, center_lng, radius_m, start_date, end_date").eq("id", projectId).maybeSingle()
  if (!p) return null
  const [{ rows }, { data: pairs }] = await Promise.all([loadEvidence(projectId), supabase.from("pairs").select("before_asset_id, after_asset_id").eq("project_id", projectId)])
  const phases = splitPhases(rows)
  const report = findGaps({
    project: { center: p.center_lat !== null && p.center_lng !== null ? { lat: p.center_lat, lng: p.center_lng } : null, radiusM: p.radius_m ?? 500, startDate: p.start_date, endDate: p.end_date, activityType: p.activity_type },
    photos: rows.map((r) => ({
      id: r.id, lat: r.lat, lng: r.lng, time: r.time, tags: r.tags ?? [], trustScore: r.trust_score, reviewStatus: r.review_status,
      isImage: r.resource_type === "image", isRetake: !!r.capture_proof?.payload?.ghostAssetId,
    })),
    pairedIds: new Set((pairs ?? []).flatMap((x) => [x.before_asset_id, x.after_asset_id])),
    beforeIds: phases?.before ?? null,
    now: Date.now(),
  })
  // Small thumbnails of the photos to line up with (the field team sees them in the shot list; faces pixelated, as on every shared page).
  const byId = new Map(rows.map((r) => [r.id, r.secure_url]))
  const ghostThumbs = Object.fromEntries(report.shots.flatMap((s) => (s.ghostId && byId.has(s.ghostId) ? [[s.ghostId, byId.get(s.ghostId)!.replace("/upload/", "/upload/e_pixelate_faces/c_fill,w_240,h_180,f_auto,q_auto/")]] : [])))
  return { ...report, project: { id: p.id, name: p.name }, ghostThumbs }
}

export const shotListUrl = (projectId: string) => `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/capture/list?project=${projectId}`
export const shotListQr = (projectId: string) => QRCode.toDataURL(shotListUrl(projectId), { margin: 1, width: 240 })
