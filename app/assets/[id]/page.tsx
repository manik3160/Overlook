import Link from "next/link"
import { notFound } from "next/navigation"
import TrustBadge from "@/components/TrustBadge"
import ReviewButtons from "@/components/ReviewButtons"
import AnalyzeOneButton from "@/components/AnalyzeOneButton"
import { supabase } from "@/lib/supabase"
import { formatTime } from "@/lib/dates"
import type { TrustFlag } from "@/lib/trust"

export const dynamic = "force-dynamic"

type Asset = {
  id: string; public_id: string; secure_url: string; resource_type: string; etag: string | null; phash: string | null
  width: number | null; height: number | null; taken_at: string | null; lat: number | null; lng: number | null; has_exif: boolean
  status: string; tags: string[] | null; caption: string | null; signals: Record<string, unknown> | null
  trust_score: number | null; trust_flags: TrustFlag[] | null; review_status: string; project_id: string | null; created_at: string
}

export default async function AssetPage(props: PageProps<"/assets/[id]">) {
  const { id } = await props.params
  const { data: asset } = await supabase.from("assets").select("*").eq("id", id).maybeSingle<Asset>()
  if (!asset) notFound()
  const { data: project } = asset.project_id ? await supabase.from("projects").select("id, name").eq("id", asset.project_id).maybeSingle() : { data: null }

  const flags = asset.trust_flags ?? []
  const preview = asset.secure_url.replace("/upload/", "/upload/c_limit,w_900,f_auto,q_auto/")

  return (
    <main className="space-y-6 p-8">
      <Link href={project ? `/projects/${project.id}` : "/upload"} className="underline">← {project ? project.name : "Uploads"}</Link>
      <h1 className="text-xl font-semibold break-all">{asset.public_id}</h1>

      {asset.resource_type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={asset.caption ?? asset.public_id} className="max-w-full" style={{ maxHeight: 480 }} />
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Trust <TrustBadge score={asset.trust_score} reviewStatus={asset.review_status} /></h2>
        {flags.length === 0 && <p className="text-sm">No flags.</p>}
        <ul className="space-y-2 text-sm">
          {flags.map((f, i) => (
            <li key={i} className="border p-2">
              <div className="font-medium">{f.code} · {f.severity}</div>
              <div>{f.reason}</div>
              {typeof f.evidence.matchAssetId === "string" && (
                <div>Matches <Link href={`/assets/${f.evidence.matchAssetId}`} className="underline">this earlier asset</Link>
                  {typeof f.evidence.hammingDistance === "number" && ` (hash distance ${f.evidence.hammingDistance})`}</div>
              )}
              {typeof f.evidence.distanceM === "number" && <div>Distance from project center: {f.evidence.distanceM} m</div>}
            </li>
          ))}
        </ul>
        <ReviewButtons assetId={asset.id} current={asset.review_status} />
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="text-lg font-medium">Details</h2>
        <div>Status: {asset.status} {asset.status === "pending" && asset.resource_type === "image" && <AnalyzeOneButton assetId={asset.id} />}</div>
        <div>Tags: {asset.tags?.length ? asset.tags.join(", ") : "none"}</div>
        <div>Caption: {asset.caption ?? "none"}</div>
        <div>Signals: {asset.signals && Object.keys(asset.signals).length ? JSON.stringify(asset.signals) : "none"}</div>
        <div>Taken: {asset.taken_at ? formatTime(asset.taken_at) : "no time metadata"}</div>
        <div>GPS: {asset.lat !== null && asset.lng !== null ? `${asset.lat.toFixed(5)}, ${asset.lng.toFixed(5)}` : "no location metadata"}</div>
        <div>Project: {project ? <Link href={`/projects/${project.id}`} className="underline">{project.name}</Link> : "unassigned"}</div>
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="text-lg font-medium">Source</h2>
        <div>Cloudinary public_id: {asset.public_id}</div>
        <div><a href={asset.secure_url} className="underline" target="_blank" rel="noreferrer">Open original</a></div>
        <div>etag: {asset.etag ?? "n/a"} · perceptual hash: {asset.phash ?? "n/a"}</div>
      </section>
    </main>
  )
}
