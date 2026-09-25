import { cardUrl, CARD_SIZES, type CardKind } from "@/lib/cards"
import { footerLine } from "@/lib/story"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState, InlineNotice } from "@/components/ui/notice"
import type { Campaign } from "@/lib/campaign-data"

const KINDS: CardKind[] = ["instagram", "story", "story_hi"]

// Cards are plain Cloudinary URLs (faces pixelated); "Download" just adds fl_attachment. Card URLs are built by lib/cards.ts, untouched.
export default function CampaignCards({ campaign }: { campaign: Campaign }) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloud) return <InlineNotice tone="error">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set.</InlineNotice>
  if (!campaign.hero) return <EmptyState title="No cards yet">Cards need at least one verified photo (trust 80+ or approved).</EmptyState>
  const hero = { publicId: campaign.hero.public_id }
  const before = campaign.pair ? { publicId: campaign.pair.before.public_id } : null

  return (
    <ul className="flex list-none flex-wrap items-start gap-8 p-0">
      {KINDS.map((kind) => {
        const hindi = kind === "story_hi"
        const input = { cloud, hero, before, kind, headline: hindi ? campaign.headline.hi : campaign.headline.en, subline: hindi ? campaign.subline.hi : campaign.subline.en, footer: hindi ? footerLine(campaign.project.name) : undefined }
        const size = CARD_SIZES[kind]
        const square = kind === "instagram"
        return (
          <li key={kind} className="grid gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardUrl(input)} alt={`${size.label} card`} width={square ? 270 : 180} height={square ? 270 : 320} className="border border-line bg-surface-2" />
            <span className="text-eyebrow !tracking-[0.1em]">{size.label}</span>
            <a href={cardUrl(input, { download: `overlook-${kind}` })} className={buttonVariants({ variant: "outline", size: "sm" }) + " w-fit"}>Download</a>
          </li>
        )
      })}
    </ul>
  )
}
