import VerifySeal from "@/components/VerifySeal"
import { flagTitle } from "@/components/flag-copy"
import { Eyebrow, KeyValue } from "@/components/ui/layout"
import { formatDay, formatTime } from "@/lib/dates"

type Evidence = { public_id: string; secure_url: string; trust_score: number | null; review_status: string; taken_at: string | null; lat: number | null; lng: number | null; captured_live: boolean; flags: string[] }
export type CertificateManifest = {
  certificate: { id: string; issued_at: string; meaning: string }
  project: { name: string; activity_type: string | null }
  milestone: { title: string; releasePct: number; rule: { tags: string[]; minVerified: number; from: string | null; to: string | null; needPair: boolean } }
  result: { verified_photos: number; has_before_after_pair: boolean; release_pct: number }
  evidence: Evidence[]
}
const link = "text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink"

// Public view of a Pay-on-Proof release certificate (opened from /verify/<id>).
export default function MilestoneCertificate({ m, recorded, recomputed }: { m: CertificateManifest; recorded: string; recomputed: string }) {
  const match = recorded === recomputed
  const r = m.milestone.rule
  return (
    <>
      <p className="mb-10 text-small">Payment stage certificate · {m.project.name} · issued {formatTime(m.certificate.issued_at)} IST</p>
      <VerifySeal
        match={match}
        recorded={recorded}
        recomputed={recomputed}
        headline={["Certificate", match ? "unchanged" : "altered"]}
        body={match ? `The evidence record for this payment stage still hashes to the SHA-256 recorded on ${formatDay(m.certificate.issued_at)}.` : "The stored record no longer matches its recorded hash. Do not rely on this certificate."}
      />
      <p className="text-small mb-14 mt-5 max-w-[68ch]">{m.certificate.meaning}</p>

      <section className="mb-14 grid gap-4" aria-labelledby="c-stage">
        <Eyebrow>01 · Payment stage</Eyebrow>
        <h2 id="c-stage" className="text-h2">{m.milestone.title} · {m.milestone.releasePct}% of the grant</h2>
        <KeyValue rows={[
          ["Rule", `${r.minVerified}+ verified photos${r.tags.length ? ` showing ${r.tags.map((t) => t.replaceAll("_", " ")).join(" or ")}` : ""}${r.from || r.to ? `, taken ${r.from ?? "…"} to ${r.to ?? "…"}` : ""}${r.needPair ? ", plus a before/after pair" : ""}`],
          ["Result", `Ready to release: ${m.result.verified_photos} verified photos${r.needPair ? `, before/after pair ${m.result.has_before_after_pair ? "present" : "missing"}` : ""}`],
          ["Verified means", "trust score 80+ or approved by a reviewer; rejected photos never count"],
        ]} />
      </section>

      <section className="grid gap-4" aria-labelledby="c-ev">
        <Eyebrow>02 · Evidence behind it</Eyebrow>
        <h2 id="c-ev" className="sr-only">Evidence behind it</h2>
        <ul className="grid list-none gap-3 p-0">
          {m.evidence.map((e) => (
            <li key={e.public_id} className="grid grid-cols-[72px_1fr] gap-3 border-b border-line pb-3">
              {/* faces pixelated: this page is public */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.secure_url.replace("/upload/", "/upload/e_pixelate_faces/c_fill,w_144,h_108,f_auto,q_auto/")} alt="" width={72} height={54} className="h-[54px] w-[72px] object-cover" />
              <div className="text-small grid gap-0.5">
                <span className="text-fg">trust {e.trust_score ?? "n/a"}{e.review_status === "approved" ? " · approved" : ""}{e.captured_live ? " · captured live" : ""} · {e.taken_at ? formatDay(e.taken_at) : "no date"}</span>
                <span>{e.flags.filter((f) => f !== "CAPTURED_LIVE").map(flagTitle).join(" · ") || "no flags"}</span>
                <a href={e.secure_url} target="_blank" rel="noreferrer" className={link}>Original ↗</a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
