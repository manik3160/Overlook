import "server-only"
import { after } from "next/server"
import { cloudinary } from "@/lib/cloudinary"
import { supabase } from "@/lib/supabase"
import { trustBand } from "@/lib/trust"
import { FLAG_TITLES } from "@/lib/flag-titles"
import { parseCloudinaryMetadata, type FileMeta } from "@/lib/cld-exif"

// Writes what Overlook knows about each photo back onto the file in Cloudinary, so the Cloudinary Media Library
// shows (and filters by) trust band, score, review, project, flags, AI tags and caption, and files sit in a folder per
// project. Best effort: a failed sync is logged, never thrown, and never touches public_ids or URLs
// (this account uses dynamic folders, so `asset_folder` only moves the file in the Media Library).

const BANDS = ["Verified", "Needs review", "Suspicious", "Not scored"] as const
const REVIEWS = { unreviewed: "Not reviewed", approved: "Approved", rejected: "Rejected" } as const
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_")

type Field = { external_id: string; label: string; type: "enum" | "set" | "integer" | "string"; values?: { external_id: string; value: string }[] }
export const METADATA_FIELDS: Field[] = [
  { external_id: "overlook_trust_band", label: "Overlook: trust band", type: "enum", values: BANDS.map((b) => ({ external_id: slug(b), value: b })) },
  { external_id: "overlook_trust_score", label: "Overlook: trust score", type: "integer" },
  { external_id: "overlook_review", label: "Overlook: human review", type: "enum", values: Object.entries(REVIEWS).map(([k, v]) => ({ external_id: k, value: v })) },
  { external_id: "overlook_project", label: "Overlook: project", type: "string" },
  { external_id: "overlook_flags", label: "Overlook: flagged for review because", type: "set", values: Object.entries(FLAG_TITLES).map(([code, title]) => ({ external_id: code, value: title })) },
]

// Creates any missing field once per server process (Admin API, a handful of calls).
let fieldsReady: Promise<void> | null = null
export function ensureMetadataFields(): Promise<void> {
  fieldsReady ??= (async () => {
    const { metadata_fields } = await cloudinary.api.list_metadata_fields()
    const have = new Set((metadata_fields as { external_id: string }[]).map((f) => f.external_id))
    for (const f of METADATA_FIELDS) {
      if (have.has(f.external_id)) continue
      await cloudinary.api.add_metadata_field({ external_id: f.external_id, label: f.label, type: f.type, ...(f.values ? { datasource: { values: f.values } } : {}) })
    }
  })().catch((e) => {
    fieldsReady = null // retry next time
    throw e
  })
  return fieldsReady
}

type SyncRow = {
  id: string; public_id: string; resource_type: string; trust_score: number | null; trust_flags: { code: string }[] | null
  review_status: string | null; tags: string[] | null; caption: string | null; project_id: string | null
}

// Folder names cannot contain slashes; keep them readable.
const folderName = (name: string) => name.replace(/[/\\?&#%<>]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled project"

export function cloudinaryFields(row: SyncRow, projectName: string | null, photoText: string | null = null) {
  const band = row.trust_score === null ? "Not scored" : trustBand(row.trust_score)
  const flags = [...new Set((row.trust_flags ?? []).map((f) => f.code).filter((c) => c in FLAG_TITLES))]
  return {
    metadata: {
      overlook_trust_band: slug(band),
      ...(row.trust_score !== null ? { overlook_trust_score: row.trust_score } : {}),
      overlook_review: row.review_status && row.review_status in REVIEWS ? row.review_status : "unreviewed",
      overlook_project: projectName ?? "Not in a project yet",
      overlook_flags: flags,
    },
    tags: ["overlook", ...(row.tags ?? [])],
    context: { ...(row.caption ? { caption: row.caption, alt: row.caption } : {}), ...(photoText ? { photo_text: photoText.replace(/\s+/g, " ").slice(0, 500) } : {}) },
    asset_folder: `Overlook/${projectName ? folderName(projectName) : "Inbox (no project yet)"}`,
  }
}

export async function syncAssetsToCloudinary(ids: string[]): Promise<{ synced: number; failed: number }> {
  const unique = [...new Set(ids)]
  if (!unique.length) return { synced: 0, failed: 0 }
  try {
    await ensureMetadataFields()
  } catch (e) {
    console.error("[cloudinary-sync] could not set up metadata fields:", e)
    return { synced: 0, failed: unique.length }
  }
  let synced = 0, failed = 0
  for (let i = 0; i < unique.length; i += 100) {
    const { data: rows, error } = await supabase
      .from("assets")
      .select("id, public_id, resource_type, trust_score, trust_flags, review_status, tags, caption, project_id")
      .in("id", unique.slice(i, i + 100))
    if (error || !rows) {
      console.error("[cloudinary-sync] could not read assets:", error?.message)
      failed += unique.slice(i, i + 100).length
      continue
    }
    const projectIds = [...new Set(rows.map((r) => r.project_id).filter((p): p is string => !!p))]
    const { data: projects } = projectIds.length ? await supabase.from("projects").select("id, name").in("id", projectIds) : { data: [] }
    const nameOf = new Map((projects ?? []).map((p) => [p.id as string, p.name as string]))
    // words Cloudinary OCR read in the photo, so the Media Library can find it by them too
    const { data: texts } = await supabase.from("analyses").select("asset_id, result").eq("kind", "ocr").in("asset_id", rows.map((r) => r.id))
    const textOf = new Map((texts ?? []).map((t) => [t.asset_id as string, ((t.result as { text?: string | null })?.text ?? null)]))

    for (let j = 0; j < rows.length; j += 4) {
      await Promise.all(
        (rows.slice(j, j + 4) as SyncRow[]).map(async (row) => {
          const f = cloudinaryFields(row, row.project_id ? nameOf.get(row.project_id) ?? null : null, textOf.get(row.id) ?? null)
          try {
            await cloudinary.uploader.explicit(row.public_id, { type: "upload", resource_type: row.resource_type === "video" ? "video" : "image", ...f })
            synced++
          } catch (e) {
            failed++
            console.error(`[cloudinary-sync] ${row.public_id}:`, (e as { error?: unknown })?.error ?? e)
          }
        }),
      )
    }
  }
  return { synced, failed }
}

// Schedules a sync after the response is sent. Outside a request (scripts) it just runs in the background.
export function syncLater(ids: string[]): void {
  if (!ids.length) return
  const run = () => syncAssetsToCloudinary(ids).then(() => undefined, (e) => console.error("[cloudinary-sync]", e))
  try {
    after(run)
  } catch {
    void run()
  }
}

export type CloudinaryRecord = { folder: string | null; band: string | null; score: number | null; review: string | null; project: string | null; flags: string[]; tags: string[]; caption: string | null; fileMeta: FileMeta | null }

// Reads back what is stored on the file in Cloudinary right now (Admin API), with readable labels. Null if unreachable.
export async function readCloudinaryRecord(publicId: string, resourceType: string): Promise<CloudinaryRecord | null> {
  try {
    const image = resourceType !== "video"
    const r = await cloudinary.api.resource(publicId, { resource_type: image ? "image" : "video", ...(image ? { image_metadata: true } : {}) })
    const m = (r.metadata ?? {}) as Record<string, unknown>
    const label = (field: string, v: unknown) => METADATA_FIELDS.find((f) => f.external_id === field)?.values?.find((x) => x.external_id === v)?.value ?? null
    return {
      folder: r.asset_folder || null,
      band: label("overlook_trust_band", m.overlook_trust_band),
      score: typeof m.overlook_trust_score === "number" ? m.overlook_trust_score : null,
      review: label("overlook_review", m.overlook_review),
      project: typeof m.overlook_project === "string" ? m.overlook_project : null,
      flags: Array.isArray(m.overlook_flags) ? m.overlook_flags.map((c) => FLAG_TITLES[String(c)] ?? String(c)) : [],
      tags: ((r.tags ?? []) as string[]).filter((t) => t !== "overlook"),
      caption: r.context?.custom?.caption ?? null,
      fileMeta: image ? parseCloudinaryMetadata(r.image_metadata as Record<string, unknown> | undefined) : null,
    }
  } catch (e) {
    console.error("[cloudinary-sync] read failed:", (e as { error?: unknown })?.error ?? e)
    return null
  }
}
