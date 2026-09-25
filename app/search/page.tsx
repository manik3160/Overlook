import Link from "next/link"
import TrustBadge from "@/components/TrustBadge"
import { supabase } from "@/lib/supabase"
import { searchAssets, type SearchParams } from "@/lib/search"
import { TAXONOMY } from "@/lib/taxonomy"
import { thumbUrl } from "@/lib/cloudinary-url"
import { formatClock, snippet } from "@/lib/video"

export const dynamic = "force-dynamic"

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export default async function SearchPage(props: PageProps<"/search">) {
  const raw = await props.searchParams
  const params: SearchParams = Object.fromEntries(["q", "project", "tag", "band", "from", "to", "type"].map((k) => [k, first(raw[k])]))
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

  return (
    <main className="space-y-6 p-8">
      <header className="flex items-baseline gap-4">
        <Link href="/" className="underline">← Home</Link>
        <h1 className="text-2xl font-semibold">Search</h1>
      </header>

      <form method="get" className="grid max-w-2xl gap-2 text-sm">
        <label>Describe what you are looking for <input name="q" defaultValue={params.q} placeholder="e.g. garbage near the road" className="w-full border p-1" /></label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <label>Project
            <select name="project" defaultValue={params.project} className="w-full border p-1">
              <option value="">Any</option>
              {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Tag
            <select name="tag" defaultValue={params.tag} className="w-full border p-1">
              <option value="">Any</option>
              {TAXONOMY.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </label>
          <label>Trust
            <select name="band" defaultValue={params.band} className="w-full border p-1">
              <option value="">Any</option>
              <option value="Verified">Verified (80+)</option>
              <option value="Needs review">Needs review (50–79)</option>
              <option value="Suspicious">Suspicious (under 50)</option>
            </select>
          </label>
          <label>From <input type="date" name="from" defaultValue={params.from} className="w-full border p-1" /></label>
          <label>To <input type="date" name="to" defaultValue={params.to} className="w-full border p-1" /></label>
          <label>Type
            <select name="type" defaultValue={params.type} className="w-full border p-1">
              <option value="">Images and videos</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
          </label>
        </div>
        <div className="flex gap-3"><button type="submit" className="border px-3 py-1">Search</button><Link href="/search" className="underline">Clear</Link></div>
      </form>

      {error && <p role="alert">Search failed: {error}</p>}
      {!searched && <p className="text-sm">Type a description, or pick filters, then search.</p>}
      {outcome && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">{outcome.hits.length} result(s){outcome.mode === "semantic" ? " · best match first" : " · newest first"}</h2>
          {outcome.hits.length === 0 && <p className="text-sm">No matches{outcome.hidden > 0 ? ` (${outcome.hidden} weaker match(es) hidden as not similar enough)` : ""}. Only analysed photos can be found by description.</p>}
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {outcome.hits.map((h) => (
              <li key={h.id} className="space-y-1 text-sm">
                <Link href={`/assets/${h.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl(h.secure_url, h.resource_type)} alt={h.caption ?? h.public_id} width={240} height={240} />
                </Link>
                {h.transcriptMatch ? <div className="font-medium">Words found in transcript</div> : h.similarity !== null && <div className="font-medium">{Math.round(h.similarity * 100)}% match</div>}
                {h.resource_type === "video" && <div>Video</div>}
                {h.parent_asset_id && h.frame_second !== null && <div>Frame at {formatClock(Number(h.frame_second))} of a video</div>}
                {h.transcript && <div className="text-xs">“{snippet(h.transcript, params.q ?? "")}”</div>}
                <TrustBadge score={h.trust_score} reviewStatus={h.review_status} />
                {h.caption && <div>{h.caption}</div>}
                {h.tags && h.tags.length > 0 && <div>{h.tags.join(", ")}</div>}
                {h.project_id && <div>Project: {projectName.get(h.project_id) ?? "unknown"}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
