import { cn } from "@/lib/utils"

// Small "✦ Cloudinary" chip: marks the parts of the product that Cloudinary does, with one plain sentence on hover.
export default function CloudinaryMark({ says, className }: { says: string; className?: string }) {
  return (
    <span title={says} className={cn("text-eyebrow inline-flex h-[22px] w-fit items-center gap-1 whitespace-nowrap rounded-sm border border-line-strong px-2 !tracking-[0.08em] text-fg-2", className)}>
      <span aria-hidden="true">✦</span> Cloudinary
      <span className="sr-only">: {says}</span>
    </span>
  )
}
