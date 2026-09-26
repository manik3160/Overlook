import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { CircleCheck, CircleDashed, ShieldCheck } from "lucide-react"
import StatFigure from "@/components/StatFigure"
import { SealMark } from "@/components/shell/Wordmark"
import { Eyebrow } from "@/components/ui/layout"
import { EmptyState } from "@/components/ui/notice"
import { supabase } from "@/lib/supabase"
import { loadCampaign } from "@/lib/campaign-data"
import { loadMilestones } from "@/lib/milestones-data"
import { manifestHash } from "@/lib/manifest"
import { posterUrl } from "@/lib/reel"
import { formatDay, formatTime } from "@/lib/dates"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Live impact" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FEED = 12
const thumb = (url: string) => url.replace("/upload/", "/upload/e_pixelate_faces/c_fill,w_480,h_360,f_auto,q_auto/")

// PUBLIC live page for donors/CSR partners: what their funding is doing NOW, from verified evidence only
// (trust 80+ or approved; faces pixelated). Unlike the sealed story/report it changes as evidence arrives.
export default async function LivePage(props: PageProps<"/live/[projectId]">) {
  const { projectId } = await props.params
  const sp = await props.searchParams
  const embed = sp.embed === "1"
  if (!UUID.test(projectId)) notFound()
  const [c, pay, { data: reelRow }, { data: satRow }] = await Promise.all([
    loadCampaign(projectId),
    loadMilestones(projectId),
    supabase.from("reports").select("manifest, manifest_sha256").eq("project_id", projectId).eq("kind", "reel").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("reports").select("manifest, manifest_sha256").eq("project_id", projectId).eq("kind", "satellite").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!c) notFound()

  const feed = c.verifiedRows.filter((r) => r.resource_type === "image").sort((a, b) => (b.time ?? 0) - (a.time ?? 0)).slice(0, FEED)
  const lastEvidence = c.verifiedRows.reduce<number | null>((m, r) => (r.time !== null && (m === null || r.time > m) ? r.time : m), null)
  const reel = reelRow && manifestHash(reelRow.manifest) === reelRow.manifest_sha256 ? (reelRow.manifest as { reel: { url: string; seconds: number }; slides?: { slide_public_id: string }[] }) : null
  const sat = satRow && manifestHash(satRow.manifest) === satRow.manifest_sha256 ? (satRow.manifest as { verdict: { tone: string; text: string }; before: { date: string; crop: { secure_url: string } }; after: { date: string; crop: { secure_url: string } } }) : null

  return (
    <article className="grid gap-12">
      {!embed && (
        <header className="flex items-center gap-2.5 border-b border-line pb-3">
          <SealMark />
          <span className="font-heading text-[15px] font-[650] leading-none">Overlook</span>
          <span className="text-small">· Live impact page</span>
        </header>
      )}
      <div className="grid gap-3">
        <p className="text-small"><span className="mr-1.5 inline-block size-2 rounded-full bg-verified align-middle" aria-hidden="true" />Live · updates as new evidence is verified · checked {formatTime(new Date().toISOString())} IST</p>
        <h1 className="text-h1 !font-semibold">{c.project.name}</h1>
        <p className="text-lg text-fg-2">{c.headline.en}</p>
        <p className="text-small">{c.verifiedRows.length} verified photos of {c.totalPhotos} uploaded{lastEvidence ? ` · latest from ${formatDay(new Date(lastEvidence).toISOString())}` : ""}</p>
      </div>

      {c.verifiedRows.length === 0 ? (
        <EmptyState title="No verified evidence yet">Photos appear here once they are verified (trust 80+ or approved by a reviewer).</EmptyState>
      ) : (
        <>
          <section className="grid gap-4" aria-label="In numbers">
            <Eyebrow>In numbers</Eyebrow>
            <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-3">
              {c.numbers.map((n) => <StatFigure small key={n.label} eyebrow={n.label} value={n.value} />)}
            </div>
          </section>

          {pay && pay.statuses.length > 0 && (
            <section className="grid gap-3" aria-label="Payment stages">
              <Eyebrow>Funding released on proof</Eyebrow>
              <p><b className="font-semibold">{pay.releasable}%</b> of the grant has the verified evidence it needs</p>
              <ul className="grid list-none gap-2 p-0">
                {pay.statuses.map((s) => (
                  <li key={s.milestone.id} className="flex items-start gap-2">
                    {s.ready ? <CircleCheck size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-verified" aria-hidden="true" /> : <CircleDashed size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-3" aria-hidden="true" />}
                    <span>{s.milestone.title} · {s.milestone.releasePct}% · {s.ready ? "evidence complete" : "evidence still coming"}{pay.certificates[s.milestone.id] && <> · <a href={`/verify/${pay.certificates[s.milestone.id].id}`} className="text-accent-ink underline" target="_blank" rel="noreferrer">certificate ↗</a></>}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-4" aria-label="Latest verified photos">
            <Eyebrow>Latest verified photos</Eyebrow>
            <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
              {feed.map((r) => (
                <li key={r.id} className="grid gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(r.secure_url)} alt={r.caption ?? "Verified field photo"} loading="lazy" className="aspect-[4/3] w-full bg-surface-2 object-cover" />
                  <span className="text-small">{r.taken_at ? formatDay(r.taken_at) : "undated"}{r.capture_proof?.verified ? <> · <ShieldCheck size={12} className="inline align-[-1px]" aria-hidden="true" /> captured live</> : ""}</span>
                </li>
              ))}
            </ul>
          </section>

          {reel && (
            <section className="grid gap-3" aria-label="Highlight reel">
              <Eyebrow>Highlight reel</Eyebrow>
              <video src={reel.reel.url} poster={reel.slides?.[0] && process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? posterUrl(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, reel.slides[0].slide_public_id) : undefined} controls playsInline preload="metadata" className="aspect-square w-full max-w-[480px] border border-line bg-surface-2" aria-label={`Highlight reel, ${reel.reel.seconds} seconds`} />
            </section>
          )}

          {sat && (
            <section className="grid gap-3" aria-label="Seen from space">
              <Eyebrow>Seen from space</Eyebrow>
              <div className="grid max-w-[480px] grid-cols-2 gap-3">
                {[sat.before, sat.after].map((s, i) => (
                  <figure key={i} className="grid gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.crop.secure_url} alt={`Satellite view, ${formatDay(s.date)}`} className="aspect-square w-full [image-rendering:pixelated]" />
                    <figcaption className="text-small">{formatDay(s.date)}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="text-small max-w-[62ch]">{sat.verdict.text}</p>
            </section>
          )}
        </>
      )}

      <footer className="grid gap-1 border-t border-line pt-4 text-small">
        <p>Only verified photos are shown (trust score 80+ or approved by a reviewer). Faces are pixelated. Every photo traces to its original.</p>
        <p><Link href={`/story/${projectId}`} className="text-accent-ink underline" target={embed ? "_blank" : undefined}>Read the impact story</Link> · Powered by Overlook</p>
      </footer>
    </article>
  )
}
