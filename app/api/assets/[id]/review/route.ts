import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"

const bodySchema = z.object({ status: z.enum(["approved", "rejected", "unreviewed"]) })

export async function POST(request: Request, ctx: RouteContext<"/api/assets/[id]/review">) {
  const { id } = await ctx.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "status must be approved, rejected or unreviewed" }, { status: 400 })

  const { data, error } = await supabase.from("assets").update({ review_status: parsed.data.status }).eq("id", id).select("id, review_status").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
  return NextResponse.json({ asset: data })
}
