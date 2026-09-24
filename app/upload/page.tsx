import Uploader from "@/components/Uploader"
import AnalysisPanel from "@/components/AnalysisPanel"
import { getCounts } from "@/lib/analysis"
import { supabase } from "@/lib/supabase"
import { thumbUrl } from "@/lib/cloudinary-url"

export const dynamic = "force-dynamic"

type AssetRow = {
  id: string
  public_id: string
  resource_type: string
  secure_url: string
  taken_at: string | null
  lat: number | null
  lng: number | null
  has_exif: boolean
  status: string
  tags: string[] | null
  caption: string | null
}

function exifBadge(a: AssetRow): string {
  const gps = a.lat !== null && a.lng !== null
  if (gps && a.taken_at) return "GPS + time"
  if (gps) return "GPS only"
  if (a.taken_at) return "Time only"
  return "No metadata"
}

export default async function UploadPage() {
  const { data, error } = await supabase
    .from("assets")
    .select("id, public_id, resource_type, secure_url, taken_at, lat, lng, has_exif, status, tags, caption")
    .order("created_at", { ascending: false })
    .limit(200)
  const assets = (data ?? []) as AssetRow[]
  const counts = await getCounts()

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Upload</h1>
      <Uploader />
      <AnalysisPanel initial={counts} />
      {error && <p>Could not load assets: {error.message}</p>}
      <p>{assets.length} assets</p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {assets.map((a) => (
          <li key={a.id} className="space-y-1 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl(a.secure_url, a.resource_type)} alt={a.public_id} width={240} height={240} />
            <div className="font-medium">{exifBadge(a)}</div>
            <div>{a.resource_type} · {a.status}</div>
            {a.tags && a.tags.length > 0 && <div>{a.tags.join(", ")}</div>}
            {a.caption && <div>{a.caption}</div>}
            {a.taken_at && <div>{new Date(a.taken_at).toLocaleString()}</div>}
            {a.lat !== null && a.lng !== null && <div>{a.lat.toFixed(5)}, {a.lng.toFixed(5)}</div>}
          </li>
        ))}
      </ul>
    </main>
  )
}
