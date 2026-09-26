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

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h2">Shot list</h1>
        <p className="text-small">{g.project.name} · {g.shots.length} shot{g.shots.length === 1 ? "" : "s"} to take</p>
      </div>
      {g.gaps.filter((x) => x.action && x.kind !== "after_photos" && x.kind !== "coverage").map((x) => <p key={x.kind} className="text-small border-l-2 border-review pl-3">{x.text}</p>)}
      {g.shots.length === 0 ? (
        <EmptyState title="Nothing to shoot">Every spot has an after photo and the whole site is covered.</EmptyState>
      ) : (
        <ol className="grid list-none gap-4 p-0">
          {g.shots.map((s, i) => (
            <li key={s.key} className="grid grid-cols-[88px_1fr] gap-3 border-b border-line pb-4">
              {s.ghostId && g.ghostThumbs[s.ghostId] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.ghostThumbs[s.ghostId]} alt="The photo to line up with" width={88} height={66} className="h-[66px] w-[88px] object-cover" />
              ) : <span className="grid h-[66px] w-[88px] place-items-center bg-surface-2 text-small">new</span>}
              <div className="grid content-start gap-2">
                <p className="text-[15px]"><b className="font-semibold">{i + 1}.</b> {s.title}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={s.ghostId ? `/capture?project=${g.project.id}&ghost=${s.ghostId}` : `/capture?project=${g.project.id}`} className={buttonVariants({ size: "sm" })}>{s.ghostId ? "Open ghost camera" : "Open camera"}</Link>
                  <a href={maps(s.lat, s.lng)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>Directions</a>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
