import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { cloudinary } from "@/lib/cloudinary"

// New Cloudinary accounts block public delivery of PDFs, so the app streams the stored file
// through a signed download URL. Public on purpose: it is what the verify page links to.
export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/pdf">) {
  const { id } = await ctx.params
  const { data: report } = await supabase.from("reports").select("pdf_public_id, manifest").eq("id", id).maybeSingle()
  if (!report?.pdf_public_id) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  const url = cloudinary.utils.private_download_url(report.pdf_public_id, "", { resource_type: "raw", type: "upload" })
  const upstream = await fetch(url)
  if (!upstream.ok) return NextResponse.json({ error: "Could not fetch the stored PDF" }, { status: 502 })
  const name = String(report.manifest?.project?.name ?? "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
  return new NextResponse(upstream.body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="overlook-${name}.pdf"` } })
}
