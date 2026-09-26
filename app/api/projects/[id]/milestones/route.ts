import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { milestonesSchema } from "@/lib/milestones"

// Saves a project's payment stages (Pay-on-Proof). Evaluation happens on read, never stored.
export async function PUT(request: Request, ctx: RouteContext<"/api/projects/[id]/milestones">) {
  const { id } = await ctx.params
  const parsed = z.object({ milestones: milestonesSchema }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid stages" }, { status: 400 })
  const { data, error } = await supabase.from("projects").update({ milestones: parsed.data.milestones }).eq("id", id).select("id").maybeSingle()
  if (error) return NextResponse.json({ error: /milestones/.test(error.message) ? "The milestones column is missing: run supabase/migrations/0003_milestones.sql" : error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  return NextResponse.json({ saved: parsed.data.milestones.length })
}
