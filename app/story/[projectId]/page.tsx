import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { manifestHash } from "@/lib/manifest"
import { formatDay } from "@/lib/dates"

export const dynamic = "force-dynamic"

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

// PUBLIC impact story: problem -> action -> result, built only from verified evidence (faces pixelated).
export default async function StoryPage(props: PageProps<"/story/[projectId]">) {
  const { projectId } = await props.params
  if (!UUID.test(projectId)) notFound()
  const { data: report } = await supabase.from("reports").select("id, manifest, manifest_sha256, created_at").eq("project_id", projectId).eq("kind", "social").order("created_at", { ascending: false }).limit(1).maybeSingle()
  if (!report) return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-semibold">Impact story</h1><p>No story has been published for this project yet.</p></main>

  const m = report.manifest as StoryManifest
  const intact = manifestHash(report.manifest) === report.manifest_sha256
  const sections: [string, string][] = [["The problem", m.narrative.problem], ["What we did", m.narrative.action], ["The result", m.narrative.result]]

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="space-y-1">
        <p className="text-sm">{m.project.activity_type?.replace(/_/g, " ") ?? "Field project"}{m.project.start_date ? ` · ${m.project.start_date} to ${m.project.end_date ?? "ongoing"}` : ""}</p>
        <h1 className="text-3xl font-semibold">{m.project.name}</h1>
        <p className="text-xl">{m.headline.en}</p>
      </header>

      {sections.map(([title, body]) => (
        <section key={title} className="space-y-1">
          <h2 className="text-lg font-medium">{title}</h2>
          <p>{body}</p>
        </section>
      ))}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">In numbers</h2>
        <ul className="grid grid-cols-3 gap-3">
          {m.numbers.map((n) => (
            <li key={n.label} className="border p-3 text-center">
              <div className="text-2xl font-semibold">{n.value}</div>
              <div className="text-sm">{n.label}</div>
            </li>
          ))}
        </ul>
      </section>

      {m.best_pair && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Before and after</h2>
          <div className="flex flex-wrap gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <figure><img src={m.best_pair.before_url} alt="Before" width={340} height={255} /><figcaption className="text-sm">Before</figcaption></figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <figure><img src={m.best_pair.after_url} alt="After" width={340} height={255} /><figcaption className="text-sm">After</figcaption></figure>
          </div>
          {m.best_pair.summary && <p className="text-sm">{m.best_pair.summary}</p>}
        </section>
      )}

      <footer className="space-y-1 border-t pt-3 text-xs">
        <p>Built from {m.verified_photos} verified photos (of {m.total_photos} uploaded). Only photos with a trust score of 80+ or approved by a reviewer are used. Faces are pixelated.</p>
        <p>{m.story.narrative_source === "gemini" ? "Narrative written by AI from these facts only." : "Narrative generated from a fixed template using these facts only."} Published {formatDay(report.created_at)}. {intact ? "Story data integrity check: passed." : "Story data integrity check: FAILED, do not rely on this page."}</p>
      </footer>
    </main>
  )
}
