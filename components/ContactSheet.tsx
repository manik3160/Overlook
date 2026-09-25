import Link from "next/link"
import { TileImage, type TileAsset } from "@/components/EvidenceTile"
import { tileState } from "@/components/evidence-state"
import { formatDay } from "@/lib/dates"

// Photos framed like a film contact sheet: edge-print lines, frame numbers (DESIGN.md 4.9 / 7.20).
export default function ContactSheet({ edgeTop, edgeBottom, assets, dates }: {
  edgeTop: [string, string]
  edgeBottom: [string, string]
  assets: (TileAsset & { created_at: string })[]
  dates?: boolean
}) {
  return (
    <figure className="m-0 grid gap-3 border border-line bg-surface-1 p-3.5 pb-2.5">
      <div className="text-eyebrow flex justify-between text-[9.5px]"><span>{edgeTop[0]}</span><span>{edgeTop[1]}</span></div>
      <ul className="grid list-none grid-cols-4 gap-x-2 gap-y-2.5 p-0 lg:grid-cols-8">
        {assets.map((a, i) => {
          const st = tileState(a)
          const n = String(assets.length - i).padStart(2, "0")
          return (
            <li key={a.id} className="grid gap-1">
              <Link href={`/assets/${a.id}`} className="tile block" data-flagged={st.flagged || undefined} aria-label={`Frame ${n}${st.flagged ? ", flagged for review" : ""}`}>
                <TileImage asset={a} compact />
              </Link>
              <span className="font-mono text-[9px] leading-3 text-fg-3">{n}{st.flagged ? " · FLAGGED" : dates ? ` · ${formatDay(a.taken_at ?? a.created_at)}` : ""}</span>
            </li>
          )
        })}
      </ul>
      <div className="text-eyebrow flex justify-between text-[9.5px]"><span>{edgeBottom[0]}</span><span>{edgeBottom[1]}</span></div>
    </figure>
  )
}
