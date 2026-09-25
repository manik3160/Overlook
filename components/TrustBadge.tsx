import { trustBand, type TrustBand } from "@/lib/trust"

const STYLE: Record<TrustBand, string> = {
  Verified: "bg-green-100 text-green-900",
  "Needs review": "bg-amber-100 text-amber-900",
  Suspicious: "bg-red-100 text-red-900",
}

// Colour is never the only signal: the band name and score are always printed.
export default function TrustBadge({ score, reviewStatus }: { score: number | null; reviewStatus?: string }) {
  if (score === null) return <span className="rounded bg-gray-100 px-1 text-xs">Not scored</span>
  const band = trustBand(score)
  return (
    <span className={`rounded px-1 text-xs font-medium ${STYLE[band]}`}>
      {band} {score}
      {reviewStatus && reviewStatus !== "unreviewed" ? ` · ${reviewStatus}` : ""}
    </span>
  )
}
