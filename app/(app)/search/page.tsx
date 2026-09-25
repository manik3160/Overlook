import Link from "next/link"
import type { Metadata } from "next"
import { Search } from "lucide-react"
import EvidenceTile, { TileGrid } from "@/components/EvidenceTile"
import { Button } from "@/components/ui/button"
import { Field, SelectWrap, inputCls, selectCls } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/layout"
import { EmptyState, InlineNotice } from "@/components/ui/notice"
import { supabase } from "@/lib/supabase"
import { searchAssets, type SearchParams } from "@/lib/search"
import { TAXONOMY } from "@/lib/taxonomy"
import { snippet } from "@/lib/video"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Search" }

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""
const KEYS = ["q", "project", "tag", "band", "from", "to", "type"] as const
const EXAMPLES = ["garbage near the road", "people planting trees", "water body"]
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Wraps the query words in <mark> inside a transcript snippet.
function Highlight({ text, query }: { text: string; query: string }) {
  const words = query.split(/\s+/).filter((w) => w.length > 2).map(escapeRe)
  if (!words.length) return <>{text}</>
  return <>{text.split(new RegExp(`(${words.join("|")})`, "gi")).map((part, i) => (i % 2 ? <mark key={i} className="bg-accent-tint px-0.5 text-fg not-italic">{part}</mark> : part))}</>
}

export default async function SearchPage(props: PageProps<"/search">) {
  const raw = await props.searchParams
  const params: SearchParams = Object.fromEntries(KEYS.map((k) => [k, first(raw[k])]))
  const { data: projects } = await supabase.from("projects").select("id, name").order("name")
  const projectName = new Map((projects ?? []).map((p) => [p.id as string, p.name as string]))

  const searched = Object.values(params).some(Boolean)
  let outcome = null
  let error = ""
  if (searched) {
    try {
      outcome = await searchAssets(params)
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
  }

  const label: Record<string, (v: string) => string> = {
    project: (v) => projectName.get(v) ?? "project", tag: (v) => v.replaceAll("_", " "), band: (v) => v, from: (v) => `from ${v}`, to: (v) => `to ${v}`, type: (v) => `${v}s`,
  }
  const without = (k: string) => `/search?${new URLSearchParams(Object.entries(params).filter(([key, v]) => key !== k && v) as [string, string][])}`
  const active = KEYS.filter((k) => k !== "q" && params[k])

  return (
    <>
      <PageHeader eyebrow="Discover" title={<><b className="font-semibold">Search</b> evidence</>} lede="Describe a scene in plain words, or filter by tag, trust band and date." />

      <form method="get" className="mb-8 grid gap-5">
        <label className="relative block">
          <span className="sr-only">Describe what you are looking for</span>
          <Search size={18} strokeWidth={1.5} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-3" />
          <input name="q" defaultValue={params.q} placeholder='Describe what you are looking for, e.g. "garbage near the road"' className={`${inputCls} h-[52px] pl-11 pr-28 text-[17px]`} />
          <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">Search ↵</Button>
        </label>
        <div className="grid grid-cols-2 items-end gap-4 md:grid-cols-3 lg:grid-cols-7">
          <Field label="Project"><SelectWrap><select name="project" defaultValue={params.project} className={selectCls}><option value="">Any</option>{(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></SelectWrap></Field>
          <Field label="Tag"><SelectWrap><select name="tag" defaultValue={params.tag} className={selectCls}><option value="">Any</option>{TAXONOMY.map((t) => <option key={t.name} value={t.name}>{t.name.replaceAll("_", " ")}</option>)}</select></SelectWrap></Field>
          <Field label="Trust"><SelectWrap><select name="band" defaultValue={params.band} className={selectCls}><option value="">Any</option><option value="Verified">Verified (80+)</option><option value="Needs review">Needs review (50 to 79)</option><option value="Suspicious">Suspicious (under 50)</option></select></SelectWrap></Field>
          <Field label="From"><input type="date" name="from" defaultValue={params.from} className={inputCls} /></Field>
          <Field label="To"><input type="date" name="to" defaultValue={params.to} className={inputCls} /></Field>
          <Field label="Type"><SelectWrap><select name="type" defaultValue={params.type} className={selectCls}><option value="">Images and videos</option><option value="image">Images</option><option value="video">Videos</option></select></SelectWrap></Field>
          <div className="pb-2"><Link href="/search" className="text-small text-accent-ink hover:underline">Clear</Link></div>
        </div>
      </form>

      {active.length > 0 && (
        <ul className="mb-6 flex list-none flex-wrap gap-2 p-0" aria-label="Active filters">
          {active.map((k) => (
            <li key={k}><Link href={without(k)} className="text-data inline-flex h-[22px] items-center gap-1.5 rounded-sm border border-line-strong px-2 text-fg-2 hover:border-fg-3 hover:text-fg" aria-label={`Remove filter ${label[k](params[k]!)}`}>{label[k](params[k]!)} <span aria-hidden="true">×</span></Link></li>
          ))}
        </ul>
      )}

      {error && <InlineNotice tone="error">Search failed: {error}</InlineNotice>}
      {!searched && (
        <div className="grid gap-3">
          <p className="text-small">Type a description, or pick filters, then search. Try:</p>
          <ul className="flex list-none flex-wrap gap-2 p-0">{EXAMPLES.map((e) => <li key={e}><Link href={`/search?q=${encodeURIComponent(e)}`} className="text-data inline-flex h-7 items-center rounded-sm border border-line-strong px-2.5 text-fg-2 hover:border-fg-3 hover:text-fg">{e}</Link></li>)}</ul>
        </div>
      )}
      {outcome && (
        <section className="grid gap-5" aria-labelledby="res-h">
          <h2 id="res-h" className="text-h2">{outcome.hits.length} result{outcome.hits.length === 1 ? "" : "s"}<span className="text-small ml-2 font-normal">{outcome.mode === "semantic" ? "best match first" : "newest first"}</span></h2>
          {outcome.hits.length === 0 && (
            <EmptyState title="No matches">
              {outcome.hidden > 0 ? `${outcome.hidden} weaker match${outcome.hidden === 1 ? "" : "es"} hidden as not similar enough. ` : ""}Only analysed photos can be found by description.
            </EmptyState>
          )}
          <TileGrid>
            {outcome.hits.map((h) => (
              <li key={h.id}>
                <EvidenceTile asset={h} matchChip={h.transcriptMatch ? "Words in transcript" : h.similarity !== null ? `${Math.round(h.similarity * 100)}% match` : undefined}>
                  {h.transcript && <span className="text-small text-[12px] italic"><Highlight text={`“${snippet(h.transcript, params.q ?? "")}”`} query={params.q ?? ""} /></span>}
                  {h.project_id && <span className="text-data text-fg-3">{projectName.get(h.project_id) ?? "unknown project"}</span>}
                </EvidenceTile>
              </li>
            ))}
          </TileGrid>
        </section>
      )}
    </>
  )
}
