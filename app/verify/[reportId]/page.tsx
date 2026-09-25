import { notFound, redirect } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { manifestHash, type ReportManifest } from "@/lib/manifest"
import { formatDay, formatTime } from "@/lib/dates"
import { trustBand } from "@/lib/trust"

export const dynamic = "force-dynamic"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const frac = (c: { hits: number; total: number } | null) => (c && c.total ? `${c.hits}/${c.total}` : "-")

// PUBLIC, read-only: the page a QR code opens. It recomputes the hash of the stored manifest.
export default async function VerifyPage(props: PageProps<"/verify/[reportId]">) {
  const { reportId } = await props.params
  if (!UUID.test(reportId)) notFound()
  const { data: report } = await supabase.from("reports").select("id, kind, manifest, manifest_sha256, pdf_public_id, created_at").eq("id", reportId).maybeSingle()
  if (!report) notFound()

  const raw = report.manifest as { schema?: string; project?: { id?: string } }
  if (raw.schema?.startsWith("overlook-story") && raw.project?.id) redirect(`/story/${raw.project.id}`)
  const manifest = report.manifest as ReportManifest
  const recomputed = manifestHash(manifest)
  const match = recomputed === report.manifest_sha256
  const project = manifest.project
  const assets = manifest.assets ?? []
  const pairs = manifest.pairs ?? []

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Report verification</h1>
        <p>{manifest.report?.title} · {project?.name} · generated {formatDay(report.created_at)}</p>
      </header>

      <section className={`space-y-1 border-2 p-4 ${match ? "border-green-700" : "border-red-700"}`} role="status">
        <p className="text-xl font-semibold">{match ? "✅ Hash match: this report is unchanged" : "❌ Hash mismatch: this report's data has been altered"}</p>
        <p className="text-sm">{match ? "The manifest stored for this report hashes to the SHA-256 recorded when the report was generated." : "The stored manifest no longer hashes to the SHA-256 recorded at generation. Do not rely on this report."}</p>
        <p className="break-all font-mono text-xs">Recorded : {report.manifest_sha256}</p>
        <p className="break-all font-mono text-xs">Recomputed: {recomputed}</p>
        <p className="text-xs">To check it yourself: serialise the manifest as JSON with keys sorted at every level and no whitespace, then take its SHA-256.</p>
        <p className="text-sm">{report.pdf_public_id && <a href={`/api/reports/${report.id}/pdf`} className="underline">Open the PDF report</a>}</p>
      </section>
      <p className="text-sm">This confirms the report was not changed after it was generated. How reliable each photo is appears in its trust score and flags below; flagged photos are marked for human review, not declared false.</p>

      <section className="space-y-1">
        <h2 className="text-lg font-medium">Project</h2>
        <p>{project?.name} · {project?.activity_type ?? "field project"}{project?.start_date ? ` · ${project.start_date} to ${project.end_date ?? "ongoing"}` : ""}</p>
        {project?.center_lat != null && project?.center_lng != null && <p className="text-sm">Site {project.center_lat.toFixed(5)}, {project.center_lng.toFixed(5)} · geofence {project.radius_m} m</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Scorecard</h2>
        <p className="text-sm">{manifest.scorecard?.photos} photos · {manifest.scorecard?.analyzed} analyzed · evidence coverage {manifest.scorecard?.verifiedPct ?? "-"}% · average trust {manifest.scorecard?.avgTrust ?? "-"}</p>
        <table className="text-sm">
          <thead><tr className="text-left"><th className="pr-6">Signal</th><th className="pr-6">Before</th><th className="pr-6">After</th><th>All</th></tr></thead>
          <tbody>{(manifest.scorecard?.rows ?? []).map((r) => <tr key={r.key}><td className="pr-6">{r.label}</td><td className="pr-6">{frac(r.before)}</td><td className="pr-6">{frac(r.after)}</td><td>{frac(r.all)}</td></tr>)}</tbody>
        </table>
      </section>

      {pairs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Before / after</h2>
          {pairs.map((p, i) => (
            <div key={i} className="space-y-1 text-sm">
              <div className="flex gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.before_report_url} alt="Before" width={240} height={180} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.after_report_url} alt="After" width={240} height={180} />
              </div>
              <p>{p.change_summary}</p>
              <p className="text-xs">{p.before_public_id} → {p.after_public_id} · {p.days_apart} days apart</p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Every photo behind this report ({assets.length})</h2>
        <ul className="space-y-3">
          {assets.map((a) => (
            <li key={a.public_id} className="flex gap-3 border p-2 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.report_url} alt="" width={120} height={90} />
              <div className="space-y-0.5">
                <div className="break-all font-mono text-xs">{a.public_id}</div>
                <div>{a.trust_score === null ? "Not scored" : `${trustBand(a.trust_score)} ${a.trust_score}`}{a.review_status !== "unreviewed" ? ` · ${a.review_status}` : ""}</div>
                {a.flags.map((f, i) => <div key={i} className="text-xs">{f.code}: {f.reason}</div>)}
                <div className="text-xs">{a.taken_at ? formatTime(a.taken_at) : "no time metadata"} · {a.lat != null && a.lng != null ? `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}` : "no GPS"}</div>
                <div className="text-xs"><a href={a.original_url} className="underline" target="_blank" rel="noreferrer">Original</a> · <a href={a.report_url} className="underline" target="_blank" rel="noreferrer">Transformation used in the report</a></div>
                <div className="break-all font-mono text-[10px]">etag {a.etag ?? "n/a"} · pHash {a.phash ?? "n/a"}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
