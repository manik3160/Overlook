import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Fingerprint } from "lucide-react"
import BeforeAfterSlider from "@/components/BeforeAfterSlider"
import StatFigure from "@/components/StatFigure"
import { Eyebrow } from "@/components/ui/layout"
import { EmptyState, InlineNotice } from "@/components/ui/notice"
import { supabase } from "@/lib/supabase"
import { manifestHash } from "@/lib/manifest"
import { formatDay } from "@/lib/dates"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Impact story" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
type StoryManifest = {
  story: { generated_at: string; narrative_source: string }
  project: { name: string; activity_type: string | null; start_date: string | null; end_date: string | null }
  headline: { en: string; hi: string }
  numbers: { label: string; value: string }[]
  narrative: { problem: string; action: string; result: string }
  verified_photos: number; total_photos: number
  best_pair: { before_url: string; after_url: string; summary: string | null } | null
}

// Weight contrast (light sentence, one heavy figure): bold the first number in the headline.
function Headline({ text }: { text: string }) {
  const m = text.match(/^([\s\S]*?)(\d[\d,.]*%?)([\s\S]*)$/)
  return m ? <>{m[1]}<b className="font-semibold">{m[2]}</b>{m[3]}</> : <>{text}</>
}

// PUBLIC impact story: problem -> action -> result, built only from verified evidence (faces pixelated).
export default async function StoryPage(props: PageProps<"/story/[projectId]">) {
  const { projectId } = await props.params
  if (!UUID.test(projectId)) notFound()
  const { data: report } = await supabase.from("reports").select("id, manifest, manifest_sha256, created_at").eq("project_id", projectId).eq("kind", "social").order("created_at", { ascending: false }).limit(1).maybeSingle()
  if (!report) return <EmptyState title="Impact story">No story has been published for this project yet.</EmptyState>

  const m = report.manifest as StoryManifest
  const intact = manifestHash(report.manifest) === report.manifest_sha256
  const sections: [string, string, string][] = [["01", "The problem", m.narrative.problem], ["02", "What we did", m.narrative.action], ["03", "The result", m.narrative.result]]

  return (
    <article className="grid gap-16">
      {!intact && <InlineNotice tone="error">Story data integrity check failed. Do not rely on this page.</InlineNotice>}
      <header className="grid gap-4">
        <Eyebrow mark>{m.project.activity_type?.replace(/_/g, " ") ?? "Field project"}{m.project.start_date ? ` · ${m.project.start_date} to ${m.project.end_date ?? "ongoing"}` : ""}</Eyebrow>
        <p className="text-h1 !font-semibold">{m.project.name}</p>
        <h1 className="text-display max-md:!text-[34px] max-md:!leading-[38px]"><Headline text={m.headline.en} /></h1>
      </header>

      <div className="grid gap-10 border-t border-line pt-10">
        {sections.map(([n, title, body]) => (
          <section key={title} className="grid gap-2 md:grid-cols-[160px_1fr] md:gap-8" aria-label={title}>
            <p className="text-eyebrow">{n} {title}</p>
            <p className="max-w-[60ch] text-[17px] leading-[28px]">{body}</p>
          </section>
        ))}
      </div>

      <section className="grid gap-5" aria-labelledby="s-num">
        <Eyebrow>In numbers</Eyebrow>
        <h2 id="s-num" className="sr-only">In numbers</h2>
        <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-3">
          {m.numbers.map((n) => <StatFigure small key={n.label} eyebrow={n.label} value={n.value} />)}
        </div>
      </section>

      {m.best_pair && (
        <section className="grid gap-4" aria-labelledby="s-ba">
          <Eyebrow>Before and after</Eyebrow>
          <h2 id="s-ba" className="sr-only">Before and after</h2>
          <BeforeAfterSlider beforeUrl={m.best_pair.before_url} afterUrl={m.best_pair.after_url} nudge />
          {m.best_pair.summary && <p className="max-w-[62ch]">{m.best_pair.summary}</p>}
        </section>
      )}

      <footer className="grid gap-2 border-t border-line pt-4">
        <p className="text-small">Built from {m.verified_photos} verified photos (of {m.total_photos} uploaded). Only photos with a trust score of 80+ or approved by a reviewer are used. Faces are pixelated.</p>
        <p className="text-small flex flex-wrap items-center gap-x-1">
          {m.story.narrative_source === "gemini" ? "Narrative written by AI from these facts only." : "Narrative generated from a fixed template using these facts only."} Published {formatDay(report.created_at)}.
          <span className={intact ? "inline-flex items-center gap-1 text-verified" : "text-suspicious"}><Fingerprint size={13} strokeWidth={1.5} aria-hidden="true" />{intact ? "Integrity check passed." : "Integrity check FAILED."}</span>
        </p>
      </footer>
    </article>
  )
}
