import { CircleCheck, CircleDashed, CircleHelp } from "lucide-react"
import VerifySeal from "@/components/VerifySeal"
import { Eyebrow } from "@/components/ui/layout"
import { formatDay, formatTime } from "@/lib/dates"
import { VERDICT_LABEL, type ClaimResult, type Verdict } from "@/lib/claims"

type Photo = { id: string; public_id: string; secure_url: string; trust_score: number | null; taken_at: string | null }
export type ClaimsManifest = {
  check: { checked_at: string; meaning: string }
  project: { name: string }
  input_text: string
  summary: { supported: number; partly: number; noEvidence: number }
  results: (ClaimResult & { photos: Photo[] })[]
}
const ICON: Record<Verdict, React.ReactNode> = {
  supported: <CircleCheck size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-verified" aria-hidden="true" />,
  partly: <CircleDashed size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-review" aria-hidden="true" />,
  no_evidence: <CircleHelp size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-3" aria-hidden="true" />,
}

// Public, sealed result of a claim check (opened from /verify/<id>). Photos are shown with faces pixelated.
export default function ClaimsResult({ m, recorded, recomputed }: { m: ClaimsManifest; recorded: string; recomputed: string }) {
  const match = recorded === recomputed
  return (
    <>
      <p className="mb-10 text-small">Claim check · {m.project.name} · {formatTime(m.check.checked_at)} IST</p>
      <VerifySeal match={match} recorded={recorded} recomputed={recomputed} headline={["Claim check", match ? "unchanged" : "altered"]}
        body={match ? `This result still hashes to the SHA-256 recorded on ${formatDay(m.check.checked_at)}.` : "The stored result no longer matches its recorded hash. Do not rely on it."} />
      <p className="text-small mb-10 mt-5 max-w-[68ch]">{m.check.meaning}</p>
      <p className="mb-8 text-lg"><b className="font-semibold">{m.summary.supported}</b> supported · <b className="font-semibold">{m.summary.partly}</b> partly supported · <b className="font-semibold">{m.summary.noEvidence}</b> no evidence found</p>
      <section className="mb-12 grid gap-5" aria-label="Claims">
        <Eyebrow>Claims</Eyebrow>
        <ol className="grid list-none gap-5 p-0">
          {m.results.map((r, i) => (
            <li key={i} className="grid gap-2 border-b border-line pb-5">
              <p className="flex items-start gap-2">{ICON[r.verdict]}<span><b className="font-semibold">{VERDICT_LABEL[r.verdict]}</b> · “{r.claim.text}”</span></p>
              <p className="text-small pl-[26px]">{r.reason}</p>
              {r.photos.length > 0 && (
                <ul className="flex list-none flex-wrap gap-2 p-0 pl-[26px]">
                  {r.photos.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <a href={p.secure_url} target="_blank" rel="noreferrer" title={`trust ${p.trust_score ?? "n/a"}${p.taken_at ? ` · ${formatDay(p.taken_at)}` : ""}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.secure_url.replace("/upload/", "/upload/e_pixelate_faces/c_fill,w_160,h_120,f_auto,q_auto/")} alt="" width={80} height={60} className="h-[60px] w-[80px] object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>
      <details className="text-small"><summary className="cursor-pointer text-fg">Text that was checked</summary><p className="mt-2 max-w-[68ch] whitespace-pre-wrap">{m.input_text}</p></details>
    </>
  )
}
