import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { analyzeAsset, getCounts, type AssetRow } from "@/lib/analysis"
import { RateLimitError } from "@/lib/errors"

export const maxDuration = 60

const bodySchema = z.object({ limit: z.number().int().min(1).max(5).default(2), ids: z.array(z.string().uuid()).optional() })

// Processes up to `limit` pending images (sequentially) and reports progress. The UI polls this.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "limit must be 1-5" }, { status: 400 })

  let query = supabase
    .from("assets")
    .select("id, public_id, secure_url, etag, resource_type")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(parsed.data.limit)
  if (parsed.data.ids) query = query.in("id", parsed.data.ids) // analyse only these (saves credits)
  const { data: pending, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { id: string; public_id: string; status: string; error?: string; apiCalls: number }[] = []
  let rateLimited: string | null = null

  for (const asset of (pending ?? []) as AssetRow[]) {
    await supabase.from("assets").update({ status: "analyzing" }).eq("id", asset.id)
    try {
      const outcome = await analyzeAsset(asset)
      if (outcome.status === "failed") await supabase.from("assets").update({ status: "failed" }).eq("id", asset.id)
      results.push({ id: asset.id, public_id: asset.public_id, status: outcome.status, error: outcome.error, apiCalls: outcome.apiCalls })
    } catch (err) {
      await supabase.from("assets").update({ status: "pending" }).eq("id", asset.id)
      if (err instanceof RateLimitError) {
        rateLimited = err.message
        break
      }
      throw err
    }
  }

  return NextResponse.json({ results, counts: await getCounts(), rateLimited })
}
