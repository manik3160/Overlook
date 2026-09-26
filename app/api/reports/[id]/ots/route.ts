import { NextResponse } from "next/server"
import { loadTimestamp, otsForRow } from "@/lib/ots-server"

// The standard OpenTimestamps proof file for a report (check it on opentimestamps.org with the manifest JSON).
export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/ots">) {
  const { id } = await ctx.params
  const row = await loadTimestamp(id)
  if (!row) return NextResponse.json({ error: "This report has no timestamp yet" }, { status: 404 })
  return new NextResponse(new Uint8Array(otsForRow(row)), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="overlook-${id}.json.ots"` } })
}
