import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { canonicalJson } from "@/lib/manifest"

// The exact bytes whose SHA-256 is the report's recorded hash (keys sorted, no whitespace). With the .ots file,
// anyone can check the timestamp on opentimestamps.org without trusting Overlook.
export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/manifest">) {
  const { id } = await ctx.params
  const { data } = await supabase.from("reports").select("manifest, kind").eq("id", id).neq("kind", "timestamp").maybeSingle()
  if (!data) return NextResponse.json({ error: "Report not found" }, { status: 404 })
  return new NextResponse(canonicalJson(data.manifest), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="overlook-${id}.json"` } })
}
