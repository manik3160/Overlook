import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import VerifySeal from "@/components/VerifySeal"
import MilestoneCertificate, { type CertificateManifest } from "@/components/MilestoneCertificate"
import ClaimsResult, { type ClaimsManifest } from "@/components/ClaimsResult"
import TimestampPanel from "@/components/TimestampPanel"
import TrustBadge from "@/components/TrustBadge"
import StatFigure from "@/components/StatFigure"
import { flagTitle } from "@/components/flag-copy"
import { Eyebrow, KeyValue } from "@/components/ui/layout"
import { supabase } from "@/lib/supabase"
import { NA } from "@/lib/copy"
import { manifestHash, type ReportManifest } from "@/lib/manifest"
import { formatDay, formatTime } from "@/lib/dates"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Report verification" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const frac = (c: { hits: number; total: number } | null) => (c && c.total ? `${c.hits}/${c.total}` : NA)
const link = "text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink"

// PUBLIC, read-only: the page a QR code opens. It recomputes the hash of the stored manifest.
export default async function VerifyPage(props: PageProps<"/verify/[reportId]">) {
  const { reportId } = await props.params
  if (!UUID.test(reportId)) notFound()
  const { data: report } = await supabase.from("reports").select("id, kind, manifest, manifest_sha256, pdf_public_id, created_at").eq("id", reportId).maybeSingle()
  if (!report || report.kind === "timestamp") notFound()

  const raw = report.manifest as { schema?: string; project?: { id?: string } }
  if (raw.schema?.startsWith("overlook-story") && raw.project?.id) redirect(`/story/${raw.project.id}`)
  if (raw.schema?.startsWith("overlook-claims")) {
    return <><ClaimsResult m={report.manifest as ClaimsManifest} recorded={report.manifest_sha256} recomputed={manifestHash(report.manifest)} /><TimestampPanel reportId={report.id} /></>
  }
  if (raw.schema?.startsWith("overlook-milestone")) {
    return <><MilestoneCertificate m={report.manifest as CertificateManifest} recorded={report.manifest_sha256} recomputed={manifestHash(report.manifest)} /><TimestampPanel reportId={report.id} /></>
  }
  const manifest = report.manifest as ReportManifest
  const recomputed = manifestHash(manifest)
  const match = recomputed === report.manifest_sha256
  const project = manifest.project
  const assets = manifest.assets ?? []
  const pairs = manifest.pairs ?? []
  const sc = manifest.scorecard

  return (
    <>
      <div className="mb-10 grid gap-2">
        <p className="text-small">{manifest.report?.title} · {project?.name} · generated {formatDay(report.created_at)}</p>
      </div>

      <VerifySeal
        match={match}
        recorded={report.manifest_sha256}
        recomputed={recomputed}
        headline={["Report", match ? "unchanged" : "altered"]}
        body={match ? `The data behind this report still hashes to the SHA-256 recorded when it was generated on ${formatDay(report.created_at)}.` : "The stored data no longer hashes to the SHA-256 recorded at generation. Do not rely on this report."}
        pdfHref={report.pdf_public_id ? `/api/reports/${report.id}/pdf` : undefined}
      />
      <p className="text-small mb-14 mt-5 max-w-[68ch]">This confirms the report was not changed after it was generated. How reliable each photo is appears in its trust score and flags below; flagged photos are marked for human review, not declared false.</p>

      <details className="mb-14 text-small">
        <summary className="cursor-pointer text-fg">Check it yourself</summary>
        <p className="mt-2 max-w-[68ch]">Serialise the manifest as JSON with keys sorted at every level and no whitespace, then take its SHA-256. It should equal the recorded value above.</p>
      </details>

      <section className="mb-14 grid gap-4" aria-labelledby="v-project">
        <Eyebrow>01 · Project</Eyebrow>
        <h2 id="v-project" className="sr-only">Project</h2>
        <KeyValue rows={[
          ["Name", project?.name ?? NA],
          ["Activity", project?.activity_type ?? "field project"],
          ["Dates", project?.start_date ? `${project.start_date} to ${project.end_date ?? "ongoing"}` : NA],
          ...(project?.center_lat != null && project?.center_lng != null ? [["Site", `${project.center_lat.toFixed(5)}, ${project.center_lng.toFixed(5)} · geofence ${project.radius_m} m`] as [string, string]] : []),
        ]} />
      </section>

      <section className="mb-14 grid gap-5" aria-labelledby="v-score">
        <Eyebrow>02 · Scorecard</Eyebrow>
        <h2 id="v-score" className="sr-only">Scorecard</h2>
        <div className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-4">
          <StatFigure small eyebrow="Photos" value={sc?.photos} />
          <StatFigure small eyebrow="Analyzed" value={sc?.analyzed} />
          <StatFigure small eyebrow="Coverage" value={sc?.verifiedPct != null ? <>{sc.verifiedPct}<small className="ml-0.5 text-[0.5em] text-fg-3">%</small></> : null} />
          <StatFigure small eyebrow="Avg trust" value={sc?.avgTrust} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr className="text-eyebrow border-b border-line"><th className="pb-2.5 pr-6 font-medium">Signal</th><th className="pb-2.5 pr-6 font-medium">Before</th><th className="pb-2.5 pr-6 font-medium">After</th><th className="pb-2.5 font-medium">All</th></tr></thead>
            <tbody>{(sc?.rows ?? []).map((r) => <tr key={r.key} className="border-b border-line"><td className="py-2.5 pr-6">{r.label}</td><td className="text-data pr-6">{frac(r.before)}</td><td className="text-data pr-6">{frac(r.after)}</td><td className="text-data">{frac(r.all)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {pairs.length > 0 && (
        <section className="mb-14 grid gap-6" aria-labelledby="v-pairs">
          <Eyebrow>03 · Before / after</Eyebrow>
          <h2 id="v-pairs" className="sr-only">Before and after</h2>
          {pairs.map((p, i) => (
            <div key={i} className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.before_report_url} alt="Before" className="aspect-[4/3] w-full bg-surface-2 object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.after_report_url} alt="After" className="aspect-[4/3] w-full bg-surface-2 object-cover" />
              </div>
              {p.change_summary && <p className="max-w-[62ch]">{p.change_summary}</p>}
              <p className="text-data break-all text-fg-3">{p.before_public_id} → {p.after_public_id} · {p.days_apart} days apart</p>
            </div>
          ))}
        </section>
      )}

      {manifest.compliance && (
        <section className="mb-14 grid gap-4" aria-labelledby="v-csr">
          <Eyebrow>CSR compliance annex</Eyebrow>
          <h2 id="v-csr" className="sr-only">CSR compliance annex</h2>
          <KeyValue rows={[
            ["Schedule VII category", manifest.compliance.schedule_vii],
            ["UN SDGs", manifest.compliance.sdgs.length ? manifest.compliance.sdgs.map((g) => `SDG ${g.number} ${g.name}`).join("; ") : NA],
            ["Verified photos", `${manifest.compliance.evidence.verified} of ${manifest.compliance.evidence.photos}${manifest.compliance.evidence.verified_pct !== null ? ` (${manifest.compliance.evidence.verified_pct}%)` : ""}`],
            ["Flagged / not scored", `${manifest.compliance.evidence.flagged_for_review} / ${manifest.compliance.evidence.not_scored}`],
            ["Captured live", String(manifest.compliance.evidence.captured_live)],
            ...manifest.compliance.milestones.map((ms): [string, string] => [`Stage: ${ms.title} (${ms.release_pct}%)`, ms.ready ? "evidence complete" : "evidence still coming"]),
          ]} />
          <p className="text-small max-w-[68ch]">{manifest.compliance.note}</p>
        </section>
      )}

      <section className="grid gap-4" aria-labelledby="v-photos">
        <Eyebrow>04 · Every photo behind this report</Eyebrow>
        <h2 id="v-photos" className="text-h2">{assets.length} photos, each traced to its original</h2>
        <ul className="list-none p-0">
          {assets.map((a) => (
            <li key={a.public_id} className="grid gap-4 border-b border-line py-4 sm:grid-cols-[120px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.report_url} alt="" className="aspect-[4/3] w-full bg-surface-2 object-cover" />
              <div className="grid min-w-0 content-start gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-data break-all">{a.public_id}</span>
                  <TrustBadge score={a.trust_score} reviewStatus={a.review_status} />
                </div>
                {a.flags.map((f, i) => <span key={i} className="text-small"><b className="font-medium text-fg">{flagTitle(f.code)}.</b> {f.reason}</span>)}
                <span className="text-data text-fg-3">{a.taken_at ? formatTime(a.taken_at) : "no time metadata"} · {a.lat != null && a.lng != null ? `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}` : "no GPS"}</span>
                <span className="flex flex-wrap gap-x-4 text-[13px]">
                  <a href={a.original_url} className={link} target="_blank" rel="noreferrer">Original ↗</a>
                  <a href={a.report_url} className={link} target="_blank" rel="noreferrer">Transformation used in report ↗</a>
                </span>
                <span className="text-hash break-all text-[10px] text-fg-3">etag {a.etag ?? "n/a"} · pHash {a.phash ?? "n/a"}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <TimestampPanel reportId={report.id} />
    </>
  )
}
