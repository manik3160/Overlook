import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createProjectSchema } from "@/lib/project-schema"

export async function POST(request: Request) {
  const parsed = createProjectSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid project", details: parsed.error.issues }, { status: 400 })

  const { asset_ids, ...fields } = parsed.data
  const { data: project, error } = await supabase.from("projects").insert(fields).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (asset_ids?.length) {
    const { error: assignError } = await supabase.from("assets").update({ project_id: project.id }).in("id", asset_ids).is("project_id", null)
    if (assignError) return NextResponse.json({ error: assignError.message }, { status: 500 })
  }
  return NextResponse.json({ project })
}
