import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { syncLater } from "@/lib/cloudinary-sync"
import { recomputeProjectTrust } from "@/lib/trust-db"
import { updateProjectSchema } from "@/lib/project-schema"

export async function PATCH(request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params
  const parsed = updateProjectSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid project", details: parsed.error.issues }, { status: 400 })

  const { data, error } = await supabase.from("projects").update(parsed.data).eq("id", id).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  await recomputeProjectTrust(id) // geofence / dates may have changed
  if (parsed.data.name !== undefined) {
    // renamed: the project name is the Cloudinary folder + metadata value
    const { data: rows } = await supabase.from("assets").select("id").eq("project_id", id)
    syncLater((rows ?? []).map((r) => r.id as string))
  }
  return NextResponse.json({ project: data })
}
