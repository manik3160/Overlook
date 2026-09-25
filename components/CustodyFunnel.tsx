import Link from "next/link"
import type { Stats } from "@/lib/stats"

export type Bands = { verified: number; review: number; suspicious: number }

function Stage({ href, eyebrow, value, of, bar, note }: { href?: string; eyebrow: string; value: number; of?: number; bar: React.ReactNode; note: string }) {
  const inner = (
    <>
      <span className="text-eyebrow">{eyebrow}</span>
      <span className="text-data-xl">{value}{of !== undefined && <small className="ml-1 text-[0.5em] text-fg-3">/ {of}</small>}</span>
      <span className="flex h-2 gap-0.5 bg-surface-3" aria-hidden="true">{bar}</span>
      <span className="text-data text-fg-3">{note}</span>
    </>
  )
  const cls = "relative grid content-start gap-2 border-l border-line px-5 pb-[22px] pt-5 first:border-l-0 first:pl-0 max-lg:nth-3:border-l-0 max-lg:nth-3:pl-0 max-lg:nth-[n+3]:border-t"
  return href ? <Link href={href} className={`${cls} hover:bg-surface-1`}>{inner}</Link> : <div className={cls}>{inner}</div>
}

const seg = (n: number, total: number, color: string) => (n > 0 ? <i key={color} style={{ width: `${(n / Math.max(total, 1)) * 100}%`, background: color }} /> : null)

// Chain of custody, left to right (DESIGN.md 7.19). Bar colours tell the develop story: blue = not yet proven.
export default function CustodyFunnel({ stats, bands, reports, stories }: { stats: Stats; bands: Bands; reports: number; stories: number }) {
  const t = stats.total
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="grid grid-cols-2 border-y border-line lg:col-span-9 lg:grid-cols-4">
        <Stage href="/upload" eyebrow="Uploaded" value={t} bar={seg(t, t, "var(--accent-ink)")} note={`${stats.photos} photos · ${stats.videos} videos${stats.frames ? ` · ${stats.frames} frames` : ""}`} />
        <Stage href="/upload" eyebrow="Analyzed" value={stats.analyzed} bar={seg(stats.analyzed, t, "var(--fg)")} note={`${stats.pending} waiting · ${stats.failed} failed`} />
        <Stage href="/review" eyebrow="Scored" value={stats.scored} bar={<>{seg(bands.verified, t, "var(--verified)")}{seg(bands.review, t, "var(--review)")}{seg(bands.suspicious, t, "var(--suspicious)")}</>} note={`${bands.verified} · ${bands.review} · ${bands.suspicious} by band`} />
        <Stage href="/search?band=Verified" eyebrow="Verified" value={stats.verified} of={stats.scored} bar={seg(stats.verified, t, "var(--verified)")} note="trust 80+ or approved" />
      </div>
      <div className="grid content-start border-t border-line lg:col-span-3">
        <Link href="/review" className="flex items-baseline justify-between border-b border-line py-3.5 hover:bg-surface-1">
          <span className="text-[13px]">Flagged for review</span>
          <span className="font-mono text-[28px] font-light leading-8 tabular-nums text-review">{stats.awaitingReview}</span>
        </Link>
        <div className="flex items-baseline justify-between border-b border-line py-3.5"><span className="text-[13px]">Sealed reports</span><span className="font-mono text-[28px] font-light leading-8 tabular-nums">{reports}</span></div>
        <div className="flex items-baseline justify-between border-b border-line py-3.5"><span className="text-[13px]">Public stories</span><span className="font-mono text-[28px] font-light leading-8 tabular-nums">{stories}</span></div>
      </div>
      <ul className="flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 lg:col-span-12" aria-label="Legend">
        {[["var(--accent-ink)", "Blue = uploaded, not yet verified"], ["var(--verified)", `Verified ${bands.verified}`], ["var(--review)", `Needs review ${bands.review}`], ["var(--suspicious)", `Suspicious ${bands.suspicious}`]].map(([c, l]) => (
          <li key={l} className="text-small flex items-center gap-2"><span className="size-2.5 rounded-[2px]" style={{ background: c }} />{l}</li>
        ))}
      </ul>
    </div>
  )
}
