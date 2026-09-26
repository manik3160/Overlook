import { after, NextResponse } from "next/server"
import { stampReport } from "@/lib/ots-server"
import { randomUUID } from "node:crypto"
import QRCode from "qrcode"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { cloudinary } from "@/lib/cloudinary"
import { manifestHash } from "@/lib/manifest"
import { buildReportManifest } from "@/lib/report-data"
import { renderReportPdf } from "@/lib/report-pdf"
import { complianceInputSchema, suggestCompliance } from "@/lib/compliance"

export const maxDuration = 120

const bodySchema = z.object({ kind: z.enum(["donor", "csr"]), compliance: complianceInputSchema.optional() })

function uploadPdf(buffer: Buffer, publicId: string): Promise<{ public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: "raw", public_id: publicId, overwrite: true }, (err, res) => (err || !res ? reject(err ?? new Error("upload failed")) : resolve(res))).end(buffer)
  })
}

// Snapshot the project into a manifest, hash it, render the PDF (with a QR to the public verify page),
// store the PDF in Cloudinary as a raw file, and save the report row.
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/reports">) {
  const { id } = await ctx.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "kind must be donor or csr (and a valid Schedule VII category / SDGs)" }, { status: 400 })

  // CSR reports carry the compliance annex; without a choice, the suggestion for the project's activity is used.
  let compliance = parsed.data.compliance
  if (parsed.data.kind === "csr" && !compliance) {
    const { data: p } = await supabase.from("projects").select("activity_type").eq("id", id).maybeSingle()
    const s = suggestCompliance(p?.activity_type ?? null)
    compliance = { scheduleVii: s.category, sdgs: s.sdgs }
  }
  const reportId = randomUUID()
  const manifest = await buildReportManifest(id, parsed.data.kind, reportId, parsed.data.kind === "csr" ? compliance : undefined)
  if (!manifest) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  if (manifest.assets.length === 0) return NextResponse.json({ error: "This project has no photos to report on." }, { status: 422 })

  const sha256 = manifestHash(manifest)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
  const verifyUrl = `${appUrl}/verify/${reportId}`
  try {
    const pdf = await renderReportPdf({ manifest, sha256, verifyUrl, qrDataUrl: await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 }) })
    const stored = await uploadPdf(pdf, `reports/${reportId}.pdf`)
    const { data, error } = await supabase.from("reports").insert({ id: reportId, project_id: id, kind: parsed.data.kind, manifest, manifest_sha256: sha256, pdf_public_id: stored.public_id }).select("id, kind, manifest_sha256, created_at").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    after(() => stampReport(reportId)) // public timestamp, after the response: never slows or blocks the report
    return NextResponse.json({ report: data, verifyUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Report generation failed" }, { status: 500 })
  }
}
