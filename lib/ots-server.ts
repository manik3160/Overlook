import "server-only"
import { supabase } from "@/lib/supabase"
import { manifestHash } from "@/lib/manifest"
import { bitcoinHeight, CALENDARS, mergeUpgrade, otsFile, parseTimestamp } from "@/lib/ots"

const SUBMIT_TIMEOUT_MS = 6000
const UPGRADE_TIMEOUT_MS = 4000
const RECHECK_MS = 10 * 60 * 1000 // ask the calendars again at most every 10 minutes

export type CalendarProof = { url: string; proof_hex: string; upgraded: boolean }
export type TimestampManifest = {
  schema: "overlook-timestamp/1"
  report_id: string
  digest: string // the report's manifest_sha256: what is being timestamped
  submitted_at: string
  calendars: CalendarProof[]
  bitcoin: { height: number; confirmed_at: string } | null
  checked_at: string | null
}
type Row = { id: string; manifest: TimestampManifest }

const save = async (id: string, m: TimestampManifest) => supabase.from("reports").update({ manifest: m, manifest_sha256: manifestHash(m) }).eq("id", id)

export async function loadTimestamp(reportId: string): Promise<Row | null> {
  const { data } = await supabase.from("reports").select("id, manifest").eq("kind", "timestamp").eq("manifest->>report_id", reportId).limit(1).maybeSingle()
  return (data as Row | null) ?? null
}

// Sends a report's SHA-256 (only the hash, never content) to the public OpenTimestamps calendars.
// Best effort: a report is never blocked because a calendar is down. Idempotent per report.
export async function stampReport(reportId: string): Promise<Row | null> {
  const existing = await loadTimestamp(reportId)
  if (existing) return existing
  const { data: report } = await supabase.from("reports").select("id, project_id, manifest_sha256").eq("id", reportId).maybeSingle()
  if (!report || !/^[0-9a-f]{64}$/.test(report.manifest_sha256)) return null
  const digest = Buffer.from(report.manifest_sha256, "hex")
  const results = await Promise.all(CALENDARS.map(async (url): Promise<CalendarProof | null> => {
    try {
      const res = await fetch(`${url}/digest`, { method: "POST", headers: { Accept: "application/vnd.opentimestamps.v1", "Content-Type": "application/x-www-form-urlencoded" }, body: digest, signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS) })
      if (!res.ok) return null
      const proof = Buffer.from(await res.arrayBuffer())
      return parseTimestamp(digest, proof).some((a) => a.type === "pending") ? { url, proof_hex: proof.toString("hex"), upgraded: false } : null
    } catch {
      return null
    }
  }))
  const calendars = results.filter((r): r is CalendarProof => r !== null)
  if (calendars.length === 0) return null
  const manifest: TimestampManifest = { schema: "overlook-timestamp/1", report_id: reportId, digest: report.manifest_sha256, submitted_at: new Date().toISOString(), calendars, bitcoin: null, checked_at: null }
  const { data, error } = await supabase.from("reports").insert({ project_id: report.project_id, kind: "timestamp", manifest, manifest_sha256: manifestHash(manifest) }).select("id, manifest").single()
  return error ? null : (data as Row)
}

// Asks each calendar whether its pending proof has reached a Bitcoin block yet, and stores the full proof if so.
export async function upgradeTimestamp(row: Row, force = false): Promise<Row> {
  const m = row.manifest
  if (m.bitcoin || (!force && m.checked_at && Date.now() - Date.parse(m.checked_at) < RECHECK_MS)) return row
  const digest = Buffer.from(m.digest, "hex")
  const calendars = await Promise.all(m.calendars.map(async (c): Promise<CalendarProof> => {
    if (c.upgraded) return c
    const proof = Buffer.from(c.proof_hex, "hex")
    for (const a of parseTimestamp(digest, proof)) {
      if (a.type !== "pending") continue
      try {
        const res = await fetch(`${a.uri}/timestamp/${a.commitment}`, { headers: { Accept: "application/vnd.opentimestamps.v1" }, signal: AbortSignal.timeout(UPGRADE_TIMEOUT_MS) })
        if (!res.ok) continue // 404 = not in a block yet
        const merged = mergeUpgrade(proof, a.uri, Buffer.from(await res.arrayBuffer()))
        if (merged && bitcoinHeight(parseTimestamp(digest, merged)) !== null) return { ...c, proof_hex: merged.toString("hex"), upgraded: true }
      } catch { /* calendar unreachable: try again later */ }
    }
    return c
  }))
  const heights = calendars.filter((c) => c.upgraded).map((c) => bitcoinHeight(parseTimestamp(digest, Buffer.from(c.proof_hex, "hex")))!)
  const next: TimestampManifest = { ...m, calendars, checked_at: new Date().toISOString(), bitcoin: heights.length ? { height: Math.min(...heights), confirmed_at: new Date().toISOString() } : null }
  await save(row.id, next)
  return { ...row, manifest: next }
}

export const otsForRow = (row: Row) => otsFile(Buffer.from(row.manifest.digest, "hex"), row.manifest.calendars.map((c) => Buffer.from(c.proof_hex, "hex")))
