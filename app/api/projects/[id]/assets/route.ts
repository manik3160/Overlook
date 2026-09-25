import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { recomputeTrust } from "@/lib/trust-db"
import { assignSchema } from "@/lib/project-schema"

// Assign unassigned assets to this project, or remove assets from it.
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/assets">) {
  const { id } = await ctx.params
  const parsed = assignSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  const { asset_ids, action } = parsed.data

  const query =
    action === "assign"
      ? supabase.from("assets").update({ project_id: id }).in("id", asset_ids).is("project_id", null)
      : supabase.from("assets").update({ project_id: null }).in("id", asset_ids).eq("project_id", id)
  const { data, error } = await query.select("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recomputeTrust((data ?? []).map((r) => r.id as string))
  return NextResponse.json({ changed: data?.length ?? 0 })
}
