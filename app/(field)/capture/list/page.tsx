import Link from "next/link"
import type { Metadata } from "next"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/notice"
import { loadGaps } from "@/lib/gaps-data"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Shot list" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const maps = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`

// Phone page for the next field visit: each missing shot with directions and a one-tap Ghost Camera.
export default async function ShotListPage(props: PageProps<"/capture/list">) {
  const sp = await props.searchParams
  const projectId = Array.isArray(sp.project) ? sp.project[0] : sp.project
  if (!projectId || !UUID.test(projectId)) return <EmptyState title="Shot list">This link is not valid.</EmptyState>
  const g = await loadGaps(projectId)
  if (!g) return <EmptyState title="Shot list">Project not found.</EmptyState>

  const pct = g.checks ? Math.round((g.passed / g.checks) * 100) : 0
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-h2">Shot list</h1>
        <p className="text-small">{g.project.name} · {g.shots.length} shot{g.shots.length === 1 ? "" : "s"} to take</p>
        {/* Shots drop off this list once taken, so progress is the evidence checks, the same figure as the project page. */}
        <div className="grid gap-1.5" role="group" aria-label="Evidence checks progress">
          <div className="h-1.5 bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={g.checks} aria-valuenow={g.passed} aria-label={`${g.passed} of ${g.checks} evidence checks passed`}>
            <i className="block h-full bg-verified" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-data text-fg-3">{g.passed} of {g.checks} evidence checks passed</span>
        </div>
      </div>
      {g.gaps.filter((x) => x.action && x.kind !== "after_photos" && x.kind !== "coverage").map((x) => <p key={x.kind} className="text-small border-l-2 border-review pl-3">{x.text}</p>)}
      {g.shots.length === 0 ? (
        <EmptyState title="Nothing to shoot">Every spot has an after photo and the whole site is covered.</EmptyState>
      ) : (
        <ol className="grid list-none gap-4 p-0">
          {g.shots.map((s, i) => {
            const next = i === 0
            const camera = s.ghostId ? `/capture?project=${g.project.id}&ghost=${s.ghostId}` : `/capture?project=${g.project.id}`
            return (
              <li key={s.key} className={next ? "grid gap-3 rounded-md border border-line-strong bg-surface-1 p-3" : "grid gap-3 border-b border-line pb-4"}>
                <Link href={camera} className="grid grid-cols-[88px_1fr] items-center gap-3">
                  {s.ghostId && g.ghostThumbs[s.ghostId] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.ghostThumbs[s.ghostId]} alt="The photo to line up with" width={88} height={66} className="h-[66px] w-[88px] object-cover" />
                  ) : <span className="grid h-[66px] w-[88px] place-items-center bg-surface-2 text-small">new</span>}
                  <span className="grid gap-1">
                    {next && <span className="text-eyebrow">Next shot</span>}
                    <span className="text-[15px] leading-[22px]"><b className="font-semibold">{i + 1}.</b> {s.title}</span>
                  </span>
                </Link>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Link href={camera} className={buttonVariants({ variant: next ? "default" : "outline", size: "lg" })}>{s.ghostId ? "Open ghost camera" : "Open camera"}</Link>
                  <a href={maps(s.lat, s.lng)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "lg" })}>Directions</a>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
