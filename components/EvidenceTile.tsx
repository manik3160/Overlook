import Link from "next/link"
import { Clock, ClockAlert, Film, MapPin, MapPinOff } from "lucide-react"
import SafeImg from "@/components/SafeImg"
import TrustBadge from "@/components/TrustBadge"
import { tileState, type StateInput } from "@/components/evidence-state"
import { formatTime } from "@/lib/dates"
import { blurUrl, thumbUrl, videoPreviewUrl } from "@/lib/cloudinary-url"
import VideoHoverPreview from "@/components/VideoHoverPreview"
import { formatClock } from "@/lib/video"
import { cn } from "@/lib/utils"

export type TileAsset = StateInput & {
  id: string
  public_id?: string
  secure_url: string
  resource_type: string
  caption?: string | null
  tags?: string[] | null
  taken_at?: string | null
  lat?: number | null
  lng?: number | null
  parent_asset_id?: string | null
  frame_second?: number | string | null
}

const shortId = (id: string) => id.split("/").pop() ?? id

// The framed photo with develop veil, crop marks and status chips. Shared by tiles and the selectable picker.
// `compact` (small frames): the blue veil already says "not proven yet", so PENDING / video chips are dropped and the flag label shrinks.
export function TileImage({ asset, sizeClass = "aspect-square", extra, bare = false, compact = false }: { asset: TileAsset; sizeClass?: string; extra?: React.ReactNode; bare?: boolean; compact?: boolean }) {
  const st = tileState(asset)
  const src = thumbUrl(asset.secure_url, asset.resource_type)
  const isFrame = !!asset.parent_asset_id && asset.frame_second != null
  return (
    <span className="relative block">
      <span className={cn("develop-frame block", sizeClass, st.developed && "is-developed")} data-hover-develop="" style={{ backgroundImage: `url(${blurUrl(asset.secure_url, asset.resource_type)})` }}>
        <SafeImg src={src} alt={asset.caption ?? (asset.public_id ? shortId(asset.public_id) : "Evidence photo")} className="absolute inset-0 size-full object-cover" />
        <SafeImg src={src} alt="" veil className="develop-veil" />
        {!bare && !compact && asset.resource_type === "video" && <VideoHoverPreview src={videoPreviewUrl(asset.secure_url)} />}
        {!bare && st.chip === "ANALYZING" && <span className="sweep pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />}
        {!bare && st.chip && !(compact && st.chip !== "FAILED") && (
          <span className={cn("text-micro absolute left-1.5 top-1.5 bg-scrim px-1.5 py-[3px] text-white", st.chip === "FAILED" && "text-[#ffb4ab]")}>{st.chip}</span>
        )}
        {!bare && !compact && asset.resource_type === "video" && <span className="text-micro absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 bg-scrim px-1.5 py-[3px] text-white"><Film size={11} strokeWidth={1.5} aria-hidden="true" />Video</span>}
        {!bare && !compact && isFrame && <span className="text-micro absolute bottom-1.5 right-1.5 bg-scrim px-1.5 py-[3px] text-white">Frame {formatClock(Number(asset.frame_second))}</span>}
        {!bare && st.flagged && st.label && <span className={cn("text-micro absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] bg-[var(--flag)] text-white", compact ? "line-clamp-2 px-1 py-0.5 !text-[8px] !leading-[10px]" : "truncate px-1.5 py-[3px]")}>{st.label}</span>}
        {extra}
      </span>
      <span className="crop-marks" aria-hidden="true" />
    </span>
  )
}

export function MetaLine({ a }: { a: Pick<TileAsset, "taken_at" | "lat" | "lng"> }) {
  const gps = a.lat != null && a.lng != null
  const time = !!a.taken_at
  if (!gps && !time) return <span className="text-data inline-flex h-5 w-fit items-center rounded-sm border border-dashed border-line-strong px-1.5 text-[10px] uppercase text-fg-3">No metadata</span>
  return (
    <span className="text-data flex flex-wrap items-center gap-x-3 text-fg-3">
      <span className="inline-flex items-center gap-1">{gps ? <MapPin size={12} strokeWidth={1.5} aria-hidden="true" /> : <MapPinOff size={12} strokeWidth={1.5} aria-hidden="true" />}{gps ? "GPS" : "No GPS"}</span>
      <span className="inline-flex items-center gap-1">{time ? <Clock size={12} strokeWidth={1.5} aria-hidden="true" /> : <ClockAlert size={12} strokeWidth={1.5} aria-hidden="true" />}{time ? formatTime(a.taken_at!) : "No time"}</span>
    </span>
  )
}

type Props = {
  asset: TileAsset
  variant?: "default" | "compact" | "match"
  href?: string
  matchChip?: string
  children?: React.ReactNode // extra lines under the caption
  showBadge?: boolean
}

export default function EvidenceTile({ asset, variant = "default", href, matchChip, children, showBadge = true }: Props) {
  const st = tileState(asset)
  const tags = asset.tags ?? []
  const compact = variant === "compact"
  return (
    <Link href={href ?? `/assets/${asset.id}`} data-flagged={st.flagged || undefined} className="tile group grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2.5 outline-offset-4">
      <TileImage asset={asset} extra={matchChip ? <span className="text-micro absolute left-1.5 top-1.5 bg-scrim px-1.5 py-[3px] text-white">{matchChip}</span> : undefined} />
      {!compact && (
        <span className="grid min-w-0 gap-1.5">
          {showBadge && <span><TrustBadge score={asset.trust_score} reviewStatus={asset.review_status} /></span>}
          {asset.caption && <span className="text-small line-clamp-2 transition-colors group-hover:text-fg">{asset.caption}</span>}
          <MetaLine a={asset} />
          {tags.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((t) => <span key={t} className="text-data inline-flex h-5 items-center rounded-sm border border-line-strong px-1.5 text-[11px] text-fg-2">{t.replaceAll("_", " ")}</span>)}
              {tags.length > 3 && <span className="text-data inline-flex h-5 items-center px-1 text-[11px] text-fg-3">+{tags.length - 3}</span>}
            </span>
          )}
          {children}
        </span>
      )}
    </Link>
  )
}

export function TileGrid({ children, dense = false }: { children: React.ReactNode; dense?: boolean }) {
  return <ul className={cn("grid list-none gap-x-4 gap-y-6 p-0 max-sm:grid-cols-2 max-sm:gap-x-2", dense ? "grid-cols-[repeat(auto-fill,minmax(150px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(168px,1fr))]")}>{children}</ul>
}
