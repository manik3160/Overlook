import "server-only"
import { cloudinary } from "@/lib/cloudinary"
import { supabase } from "@/lib/supabase"

export type AtWork = {
  files: number | null; versions: number | null; transformations: number | null
  aiVisionUnits: number | null; aiVisionLimit: number | null; aiVisionChecks: number
  publicCopies: number; syncedToLibrary: number
  credits: number | null; creditLimit: number | null; updated: string | null
}

// Cloudinary's own usage numbers (Admin API, rate limited: cached 10 min per server process; Cloudinary itself
// refreshes them about once a day) plus what Overlook asked Cloudinary to do (from our own tables).
let cached: { at: number; usage: Record<string, unknown> | null } | null = null
async function usage(): Promise<Record<string, unknown> | null> {
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.usage
  const u = await cloudinary.api.usage().catch((e) => {
    console.error("[cloudinary-usage]", (e as { error?: unknown })?.error ?? e)
    return null
  })
  cached = { at: Date.now(), usage: u }
  return u
}

const count = async (kind: string) => (await supabase.from("analyses").select("id", { count: "exact", head: true }).eq("kind", kind)).count ?? 0

export async function cloudinaryAtWork(): Promise<AtWork> {
  const [u, aiVisionChecks, publicCopies, assets] = await Promise.all([
    usage(), count("ai_vision_tagging"), count("public_copy"),
    supabase.from("assets").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0),
  ])
  const n = (v: unknown) => (typeof v === "number" ? v : null)
  const part = (k: string) => (u?.[k] ?? null) as Record<string, unknown> | null
  return {
    files: n(u?.resources), versions: n(u?.derived_resources), transformations: n(part("transformations")?.usage),
    aiVisionUnits: n(part("ai_vision")?.usage), aiVisionLimit: n(part("ai_vision")?.limit), aiVisionChecks,
    publicCopies, syncedToLibrary: assets,
    credits: n(part("credits")?.usage), creditLimit: n(part("credits")?.limit), updated: typeof u?.last_updated === "string" ? u.last_updated : null,
  }
}
