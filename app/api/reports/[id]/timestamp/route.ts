import { NextResponse } from "next/server"
import { stampReport, upgradeTimestamp } from "@/lib/ots-server"

// Anchor a report's hash with OpenTimestamps (used for reports made before this existed), or re-check an
// existing timestamp for its Bitcoin confirmation. Idempotent and public: it only ever sends the hash.
export async function POST(_request: Request, ctx: RouteContext<"/api/reports/[id]/timestamp">) {
  const { id } = await ctx.params
  const row = await stampReport(id)
  if (!row) return NextResponse.json({ error: "Could not reach the timestamp calendars (or the report does not exist). Try again later." }, { status: 502 })
  const checked = await upgradeTimestamp(row, true)
  return NextResponse.json({ bitcoin: checked.manifest.bitcoin, calendars: checked.manifest.calendars.length })
}
