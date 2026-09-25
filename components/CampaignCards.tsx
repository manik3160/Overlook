import { cardUrl, CARD_SIZES, type CardKind } from "@/lib/cards"
import { footerLine } from "@/lib/story"
import type { Campaign } from "@/lib/campaign-data"

const KINDS: CardKind[] = ["instagram", "story", "story_hi"]

// Cards are plain Cloudinary URLs (faces pixelated); "Download" just adds fl_attachment.
export default function CampaignCards({ campaign }: { campaign: Campaign }) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloud) return <p className="text-sm">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set.</p>
  if (!campaign.hero) return <p className="text-sm">Cards need at least one verified photo (trust 80+ or approved).</p>
  const hero = { publicId: campaign.hero.public_id }
  const before = campaign.pair ? { publicId: campaign.pair.before.public_id } : null

  return (
    <ul className="flex flex-wrap items-start gap-6">
      {KINDS.map((kind) => {
        const hindi = kind === "story_hi"
        const input = { cloud, hero, before, kind, headline: hindi ? campaign.headline.hi : campaign.headline.en, subline: hindi ? campaign.subline.hi : campaign.subline.en, footer: hindi ? footerLine(campaign.project.name) : undefined }
        const size = CARD_SIZES[kind]
        return (
          <li key={kind} className="space-y-1 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardUrl(input)} alt={`${size.label} card`} width={kind === "instagram" ? 270 : 180} height={kind === "instagram" ? 270 : 320} />
            <div>{size.label}</div>
            <a href={cardUrl(input, { download: `overlook-${kind}` })} className="underline">Download</a>
          </li>
        )
      })}
    </ul>
  )
}
