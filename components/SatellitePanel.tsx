import { InlineNotice } from "@/components/ui/notice"
import { formatDay } from "@/lib/dates"

type Scene = { id: string; date: string; ndvi: number; vegetationShare: number; bareShare: number; stac_url: string; crop: { secure_url: string } }
export type SatelliteView = { before: Scene; after: Scene; verdict: { tone: "consistent" | "no_change"; text: string }; source: string; generatedAt: string; intact: boolean }

const pct = (x: number) => `${Math.round(x * 100)}%`

// Precomputed satellite cross-check (npm run satellite). Presentational only.
export default function SatellitePanel({ view }: { view: SatelliteView }) {
  return (
    <div className="grid gap-4">
      {!view.intact && <InlineNotice tone="error">Satellite record integrity check failed. Do not rely on it.</InlineNotice>}
      <div className="grid grid-cols-2 gap-4 max-w-[640px]">
        {(["before", "after"] as const).map((k) => {
          const s = view[k]
          return (
            <figure key={k} className="grid gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.crop.secure_url} alt={`Satellite view of the site, ${formatDay(s.date)}`} width={300} height={300} className="aspect-square w-full border border-line bg-surface-2 [image-rendering:pixelated]" />
              <figcaption className="text-small">
                <b className="font-semibold">{k === "before" ? "Before" : "After"}</b> · {formatDay(s.date)}<br />
                NDVI {s.ndvi.toFixed(2)} · vegetation {pct(s.vegetationShare)} · bare ground {pct(s.bareShare)}<br />
                <a href={s.stac_url} target="_blank" rel="noreferrer" className="text-accent-ink hover:underline">Source scene ↗</a>
              </figcaption>
            </figure>
          )
        })}
      </div>
      <InlineNotice tone={view.verdict.tone === "consistent" ? "success" : "neutral"}>{view.verdict.text}</InlineNotice>
      <p className="text-small text-fg-3">{view.source}. Area = the project geofence square. Cloud-free over the site. Computed {view.generatedAt}; public data, no AI.</p>
    </div>
  )
}
