import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { cachedCall } from "@/lib/cache"
import { summarizeChange } from "@/lib/gemini"
import { RateLimitError } from "@/lib/errors"

export const maxDuration = 60

const bodySchema = z.object({ limit: z.number().int().min(1).max(3).default(2) })
const small = (url: string) => url.replace("/upload/", "/upload/c_limit,w_1024,h_1024,f_jpg,q_auto/")
async function base64(url: string) {
  const res = await fetch(small(url))
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`)
  return Buffer.from(await res.arrayBuffer()).toString("base64")
}

// Writes up to `limit` missing change summaries (cached, one Gemini call per pair). The UI loops on this.
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/pairs/summarize">) {
  const { id } = await ctx.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "limit must be 1-3" }, { status: 400 })

  const { data: pending, error } = await supabase.from("pairs").select("id, before_asset_id, after_asset_id, days_apart").eq("project_id", id).is("change_summary", null).limit(parsed.data.limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rateLimited: string | null = null
  const failures: string[] = []
  for (const pair of pending ?? []) {
    try {
      const { data: imgs } = await supabase.from("assets").select("id, secure_url").in("id", [pair.before_asset_id, pair.after_asset_id])
      const url = (aid: string) => imgs?.find((i) => i.id === aid)?.secure_url as string
      const { result } = await cachedCall("gemini_change_summary", pair.after_asset_id, { before: pair.before_asset_id, v: 1 }, async () =>
        summarizeChange(await base64(url(pair.before_asset_id)), await base64(url(pair.after_asset_id)), pair.days_apart ?? 0),
      )
      await supabase.from("pairs").update({ change_summary: result }).eq("id", pair.id)
    } catch (err) {
      if (err instanceof RateLimitError) {
        rateLimited = err.message
        break
      }
      failures.push(err instanceof Error ? err.message : String(err))
    }
  }
  const { count } = await supabase.from("pairs").select("id", { count: "exact", head: true }).eq("project_id", id).is("change_summary", null)
  return NextResponse.json({ remaining: count ?? 0, rateLimited, failures })
}
