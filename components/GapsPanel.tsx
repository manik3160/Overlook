import Link from "next/link"
import { CircleAlert, Info } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import type { ProjectGaps } from "@/lib/gaps-data"

// "What's missing?" for a project, plus the way into the field shot list (link + a real, scannable QR).
export default function GapsPanel({ gaps, qrDataUrl, listUrl }: { gaps: ProjectGaps; qrDataUrl: string; listUrl: string }) {
  const ordered = [...gaps.gaps].sort((a, b) => Number(b.action) - Number(a.action))
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
                <span>{g.text}{g.kind === "review" && <> <Link href="/review" className="text-accent-ink underline">Open review</Link></>}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {gaps.shots.length > 0 && (
        <div className="grid content-start justify-items-start gap-2 lg:col-span-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR code: open the shot list on a phone" width={120} height={120} className="border border-line bg-white" />
          <p className="text-small">Scan on the field phone, or</p>
          <Link href={`/capture/list?project=${gaps.project.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Open shot list</Link>
          <span className="text-data break-all text-fg-3">{listUrl}</span>
        </div>
      )}
    </div>
  )
}
