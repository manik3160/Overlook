/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image is a PDF element, not an HTML img */
import "server-only"
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"
import { formatDay } from "@/lib/dates"
import { trustBand } from "@/lib/trust"
import type { ReportManifest } from "@/lib/manifest"

// Built-in PDF fonts only cover basic Latin, so this document sticks to plain ASCII punctuation.
const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  h1: { fontSize: 20, marginBottom: 4 },
  h2: { fontSize: 13, marginTop: 14, marginBottom: 6 },
  muted: { color: "#555" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#bbb", paddingVertical: 3, alignItems: "center" },
  head: { fontFamily: "Helvetica-Bold" },
  mono: { fontFamily: "Courier", fontSize: 7.5 },
})
const frac = (c: { hits: number; total: number } | null) => (c && c.total ? `${c.hits}/${c.total}` : "-")
const day = (iso: string | null) => (iso ? formatDay(iso) : "no time")
const band = (score: number | null) => (score === null ? "Not scored" : `${trustBand(score)} ${score}`)

type Props = { manifest: ReportManifest; sha256: string; verifyUrl: string; qrDataUrl: string }

function ReportDocument({ manifest: m, sha256, verifyUrl, qrDataUrl }: Props) {
  const p = m.project
  const sc = m.scorecard
  return (
    <Document title={`${m.report.title} - ${p.name}`}>
      <Page size="A4" style={s.page}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.h1}>{m.report.title}</Text>
            <Text style={{ fontSize: 14 }}>{p.name}</Text>
            <Text style={s.muted}>{p.activity_type ?? "field project"}{p.start_date ? ` | ${p.start_date} to ${p.end_date ?? "ongoing"}` : ""}</Text>
            {p.center_lat !== null && p.center_lng !== null && <Text style={s.muted}>Site {p.center_lat.toFixed(5)}, {p.center_lng.toFixed(5)} (geofence {p.radius_m} m)</Text>}
            {p.description && <Text style={{ marginTop: 4 }}>{p.description}</Text>}
            <Text style={[s.muted, { marginTop: 6 }]}>Generated {day(m.report.generated_at)}. Every figure below is computed from the listed photos; scan the QR code to verify this report.</Text>
          </View>
          <View style={{ width: 110, alignItems: "center" }}>
            <Image src={qrDataUrl} style={{ width: 100, height: 100 }} />
            <Text style={{ fontSize: 7, textAlign: "center" }}>Scan to verify</Text>
          </View>
        </View>
        <Text style={[s.mono, { marginTop: 6 }]}>{verifyUrl}</Text>
        <Text style={s.mono}>SHA-256 {sha256}</Text>

        <Text style={s.h2}>Impact scorecard</Text>
        <Text>{sc.photos} photos | {sc.analyzed} AI-analyzed | evidence coverage {sc.verifiedPct ?? "-"}% verified or approved | average trust {sc.avgTrust ?? "-"}</Text>
        {sc.phases && <Text style={s.muted}>Before set: {sc.phases.beforeCount} photos. After set: {sc.phases.afterCount} photos. {sc.phases.gapDays} days between.</Text>}
        <View style={{ marginTop: 6 }}>
          <View style={[s.row, s.head]}><Text style={{ width: 150 }}>Signal</Text><Text style={{ width: 70 }}>Before</Text><Text style={{ width: 70 }}>After</Text><Text style={{ width: 80 }}>All analyzed</Text></View>
          {sc.rows.map((r) => (
            <View key={r.key} style={s.row}><Text style={{ width: 150 }}>{r.label}</Text><Text style={{ width: 70 }}>{frac(r.before)}</Text><Text style={{ width: 70 }}>{frac(r.after)}</Text><Text style={{ width: 80 }}>{frac(r.all)}</Text></View>
          ))}
        </View>
        <Text style={[s.muted, { marginTop: 4 }]}>x/y = photos showing the signal / analyzed photos in the set.{m.report.rejected_excluded > 0 ? ` ${m.report.rejected_excluded} rejected photo(s) excluded.` : ""} Faces are pixelated in this report.</Text>
      </Page>

      {m.pairs.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.h2}>Before / after</Text>
          {m.pairs.map((pair, i) => (
            <View key={i} wrap={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View><Image src={pair.before_report_url} style={{ width: 250, height: 188 }} /><Text>Before</Text></View>
                <View><Image src={pair.after_report_url} style={{ width: 250, height: 188 }} /><Text>After ({pair.days_apart} days later)</Text></View>
              </View>
              <Text style={{ marginTop: 3 }}>{pair.change_summary ?? "No summary written."}</Text>
            </View>
          ))}
        </Page>
      )}

      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Evidence table ({m.assets.length} photos)</Text>
        <View style={[s.row, s.head]}><Text style={{ width: 70 }}>Photo</Text><Text style={{ width: 130 }}>Reference</Text><Text style={{ width: 90 }}>Taken / location</Text><Text style={{ width: 110 }}>Trust</Text></View>
        {m.assets.map((a) => (
          <View key={a.public_id} style={s.row} wrap={false}>
            <View style={{ width: 70 }}><Image src={a.report_url} style={{ width: 60, height: 45 }} /></View>
            <Text style={[s.mono, { width: 130 }]}>{a.public_id}</Text>
            <View style={{ width: 90 }}><Text>{day(a.taken_at)}</Text><Text style={s.muted}>{a.lat !== null && a.lng !== null ? `${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}` : "no GPS"}</Text></View>
            <View style={{ width: 200 }}><Text>{band(a.trust_score)}{a.review_status !== "unreviewed" ? ` (${a.review_status})` : ""}</Text>{a.flags.map((f, i) => <Text key={i} style={s.muted}>{f.code}</Text>)}</View>
          </View>
        ))}
        <Text style={[s.muted, { marginTop: 8 }]}>Originals and the exact transformation URL for every photo are listed on the verification page: {verifyUrl}</Text>
      </Page>

      {m.compliance && (
        <Page size="A4" style={s.page}>
          <Text style={s.h1}>Annex: evidence for CSR reporting</Text>
          <Text style={s.muted}>{p.name}</Text>
          <Text style={s.h2}>Classification</Text>
          <View style={s.row}><Text style={{ width: 150 }}>Schedule VII category</Text><Text style={{ width: 370 }}>{m.compliance.schedule_vii}</Text></View>
          <View style={s.row}><Text style={{ width: 150 }}>UN SDGs</Text><Text style={{ width: 370 }}>{m.compliance.sdgs.length ? m.compliance.sdgs.map((g) => `SDG ${g.number} ${g.name}`).join("; ") : "none selected"}</Text></View>
          <Text style={s.h2}>Evidence quality</Text>
          {([
            ["Photos in this report", String(m.compliance.evidence.photos)],
            ["Verified (trust 80+ or approved)", `${m.compliance.evidence.verified}${m.compliance.evidence.verified_pct !== null ? ` (${m.compliance.evidence.verified_pct}%)` : ""}`],
            ["Flagged for review", String(m.compliance.evidence.flagged_for_review)],
            ["Not scored yet", String(m.compliance.evidence.not_scored)],
            ["Captured live and signed on device", String(m.compliance.evidence.captured_live)],
            ["With location / with time", `${m.compliance.evidence.with_location} / ${m.compliance.evidence.with_time}`],
          ] as const).map(([k, v]) => <View key={k} style={s.row}><Text style={{ width: 250 }}>{k}</Text><Text>{v}</Text></View>)}
          {m.compliance.milestones.length > 0 && (
            <>
              <Text style={s.h2}>Payment stages (Pay-on-Proof)</Text>
              {m.compliance.milestones.map((ms) => <View key={ms.title} style={s.row}><Text style={{ width: 250 }}>{ms.title} ({ms.release_pct}%)</Text><Text>{ms.ready ? "Evidence complete" : "Evidence still coming"}</Text></View>)}
            </>
          )}
          <Text style={s.h2}>Integrity</Text>
          <Text style={s.mono}>SHA-256 {sha256}</Text>
          <Text style={[s.muted, { marginTop: 4 }]}>Verify at {verifyUrl}</Text>
          <Text style={[s.muted, { marginTop: 14 }]}>{m.compliance.note}</Text>
        </Page>
      )}
    </Document>
  )
}

export const renderReportPdf = (props: Props): Promise<Buffer> => renderToBuffer(<ReportDocument {...props} />)
