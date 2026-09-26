import Link from "next/link"
import { CircleAlert, Info } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import CopyButton from "@/components/CopyButton"
import { cn } from "@/lib/utils"
import type { ProjectGaps } from "@/lib/gaps-data"

const DIRS = [["NW", "N", "NE"], ["W", "C", "E"], ["SW", "S", "SE"]]

// The site split 3 x 3, exactly as the coverage check does (lib/gaps.ts). Filled = has photos, hollow = missing.
function SiteGrid({ empty }: { empty: Set<string> }) {
  const covered = 9 - empty.size
  return (
    <figure className="m-0 grid justify-items-start gap-2" aria-label={`Site coverage: ${covered} of 9 parts have photos`}>
      <div className="grid grid-cols-3 gap-1" aria-hidden="true">
        {DIRS.flatMap((row, r) => row.map((d, c) => {
          const miss = empty.has(`${r},${c}`)
          return (
            <span key={d} className={cn("grid size-9 place-items-center font-mono text-[9px] leading-none", miss ? "border border-dashed border-review text-review" : "bg-verified-tint text-verified")}>{d}</span>
          )
        }))}
      </div>
      <figcaption className="text-data text-fg-3">{covered} of 9 parts covered</figcaption>
    </figure>
  )
}

// "What's missing?" for a project, plus the way into the field shot list (link + a real, scannable QR).
export default function GapsPanel({ gaps, qrDataUrl, listUrl }: { gaps: ProjectGaps; qrDataUrl: string; listUrl: string }) {
  const ordered = [...gaps.gaps].sort((a, b) => Number(b.action) - Number(a.action))
  const empty = new Set(gaps.shots.filter((s) => s.kind === "coverage").map((s) => s.key.replace("coverage:", "")))
  const hasCoverage = gaps.gaps.some((g) => g.kind === "coverage")
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="grid content-start gap-3 lg:col-span-8">
        <p className="text-small">{gaps.passed} of {gaps.checks} evidence checks passed{gaps.shots.length ? ` · ${gaps.shots.length} shot${gaps.shots.length === 1 ? "" : "s"} to take on the next visit` : ""}</p>
        {ordered.length === 0 ? (
          <p>Nothing missing: every check passed.</p>
        ) : (
          <ul className="grid list-none gap-2 p-0">
            {ordered.map((g) => (
              <li key={g.kind} className="flex items-start gap-2">
                {g.action ? <CircleAlert size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-review" aria-label="Needs a field visit" /> : <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-3" aria-label="For information" />}
                {g.kind === "coverage"
                  ? <span>{empty.size} of 9 parts of the site have no photos yet (dashed squares).</span>
                  : <span>{g.text}{g.kind === "review" && <> <Link href="/review" className="text-accent-ink underline">Open review</Link></>}</span>}
              </li>
            ))}
          </ul>
        )}
        {hasCoverage && <SiteGrid empty={empty} />}
      </div>
      {gaps.shots.length > 0 && (
        <div className="grid content-start justify-items-start gap-2 lg:col-span-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR code: open the shot list on a phone" width={120} height={120} className="border border-line bg-white" />
          <p className="text-small">Scan on the field phone, or</p>
          <Link href={`/capture/list?project=${gaps.project.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Open shot list</Link>
          <span className="text-small inline-flex items-center">Or send the link<CopyButton value={listUrl} label="Copy shot list link" /></span>
        </div>
      )}
    </div>
  )
}
