import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { updateProjectSchema } from "@/lib/project-schema"

export async function PATCH(request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params
  const parsed = updateProjectSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid project", details: parsed.error.issues }, { status: 400 })

  const { data, error } = await supabase.from("projects").update(parsed.data).eq("id", id).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  return NextResponse.json({ project: data })
}
