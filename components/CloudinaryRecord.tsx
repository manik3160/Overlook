import type { CloudinaryRecord as Rec } from "@/lib/cloudinary-sync"
import CloudinaryMark from "@/components/CloudinaryMark"
import { Eyebrow, KeyValue } from "@/components/ui/layout"
import { InlineNotice } from "@/components/ui/notice"
import { NA } from "@/lib/copy"

// What Overlook has written onto this file in the Cloudinary Media Library, read live from Cloudinary.
export default function CloudinaryRecord({ record }: { record: Rec | null }) {
  return (
    <section className="grid gap-4" aria-labelledby="cld-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>In the Cloudinary library</Eyebrow>
        <CloudinaryMark says="Stored on the file in Cloudinary, so the Media Library can search and filter by it" />
      </div>
      <h2 id="cld-h" className="sr-only">Saved in the Cloudinary Media Library</h2>
      <p className="max-w-[60ch] text-[15px] leading-6 text-fg-2">
        Overlook writes its findings onto the file itself. Anyone using the Cloudinary Media Library can find this photo by project, trust band or
        reason it was flagged, without opening Overlook.
      </p>
      {record ? (
        <KeyValue rows={[
          ["Folder", record.folder ?? NA],
          ["Trust band", record.band ? `${record.band}${record.score !== null ? ` · ${record.score}` : ""}` : NA],
          ["Human review", record.review ?? NA],
          ["Flagged because", record.flags.length ? record.flags.join(", ") : "nothing"],
          ["AI tags", record.tags.length ? record.tags.map((t) => t.replaceAll("_", " ")).join(", ") : NA],
          ["Caption", record.caption ?? NA],
        ]} />
      ) : (
        <InlineNotice>Could not reach Cloudinary right now.</InlineNotice>
      )}
    </section>
  )
}
