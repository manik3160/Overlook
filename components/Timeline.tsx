import Link from "next/link"
import { thumbUrl } from "@/lib/cloudinary-url"

export type TimelineItem = { id: string; secure_url: string; resource_type: string; time: string; approx: boolean }
export type TimelineDay = { day: string; label: string; items: TimelineItem[] }

// Horizontal strip, one column per day.
export default function Timeline({ days }: { days: TimelineDay[] }) {
  if (days.length === 0) return <p className="text-sm">No photos assigned yet.</p>
  return (
    <ol className="flex gap-4 overflow-x-auto pb-2">
      {days.map((d) => (
        <li key={d.day} className="min-w-32 space-y-1 text-xs">
          <div className="font-medium">{d.label} ({d.items.length})</div>
          <div className="flex flex-wrap gap-1">
            {d.items.map((it) => (
              <Link key={it.id} href={`/assets/${it.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl(it.secure_url, it.resource_type)} alt="" width={56} height={56} title={it.approx ? "no photo time, using upload time" : it.time} />
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}
