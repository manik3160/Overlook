import StatFigure from "@/components/StatFigure"
import CloudinaryMark from "@/components/CloudinaryMark"
import type { AtWork } from "@/lib/cloudinary-usage"

const fmt = (v: number | null) => (v === null ? null : v.toLocaleString("en-IN"))

// Plain numbers for what Cloudinary does in this workspace: every figure is something a non-technical viewer can picture.
export default function CloudinaryAtWork({ w }: { w: AtWork }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <CloudinaryMark says="Storage, every photo version, AI checks and face blurring in this workspace are done by Cloudinary" />
        <p className="text-small">Everything below is done by Cloudinary for this workspace.{w.updated ? ` Cloudinary usage last updated ${w.updated}.` : ""}</p>
      </div>
      <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        <StatFigure small eyebrow="Files stored" value={fmt(w.files)} note="Photos, videos, reports and reels, kept safe in Cloudinary." />
        <StatFigure small eyebrow="Versions made on the fly" value={fmt(w.versions)} note="Previews, report copies, cards and reels, made from the originals without changing them." />
        <StatFigure small eyebrow="AI Vision checks" value={fmt(w.aiVisionChecks)} note={w.aiVisionUnits !== null ? `Photos tagged by Cloudinary AI Vision (${fmt(w.aiVisionUnits)} of ${fmt(w.aiVisionLimit)} units used).` : "Photos tagged by Cloudinary AI Vision."} />
        <StatFigure small eyebrow="Face-blurred public copies" value={fmt(w.publicCopies)} note="Stored with every face Cloudinary found already blurred, so a public page cannot unblur them." />
        <StatFigure small eyebrow="Photos labelled in the library" value={fmt(w.syncedToLibrary)} note="Trust band, project, flags and AI tags written onto each file in the Cloudinary Media Library." />
        <StatFigure small eyebrow="Cloudinary credits used" value={w.credits !== null ? w.credits.toFixed(2) : null} of={w.creditLimit ?? undefined} note={w.transformations !== null ? `${fmt(w.transformations)} transformations this month.` : undefined} />
      </div>
    </div>
  )
}
