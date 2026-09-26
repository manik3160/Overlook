import { cardUrl, CARD_SIZES, cropCompareUrls, realArea, type CardKind } from "@/lib/cards"
import { footerLine } from "@/lib/story"
import CloudinaryMark from "@/components/CloudinaryMark"
import RetryImage from "@/components/RetryImage"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState, InlineNotice } from "@/components/ui/notice"
import type { Campaign } from "@/lib/campaign-data"

const KINDS: CardKind[] = ["instagram", "story", "story_hi"]

// Cards are plain Cloudinary URLs (faces pixelated, smart crop); "Download" just adds fl_attachment. Card URLs are built by lib/cards.ts.
export default function CampaignCards({ campaign }: { campaign: Campaign }) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloud) return <InlineNotice tone="error">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set.</InlineNotice>
  if (!campaign.hero) return <EmptyState title="No cards yet">Cards need at least one verified photo (trust 80+ or approved).</EmptyState>
  const hero = { publicId: campaign.hero.public_id }
  const before = campaign.pair ? { publicId: campaign.pair.before.public_id } : null
  const en = { cloud, hero, headline: campaign.headline.en, subline: campaign.subline.en, smart: true }
  const aiCard = { ...en, kind: "story_ai" as const }
  const heroW = campaign.hero.width, heroH = campaign.hero.height
  const area = heroW && heroH ? realArea(heroW, heroH) : null
  // Smart crop shows most on photos of people, so compare on the verified photo with the most people at work.
  const cropPhoto = campaign.verifiedRows
    .filter((r) => r.resource_type === "image")
    .sort((a, b) => (b.signals?.people_working ?? 0) - (a.signals?.people_working ?? 0))[0] ?? campaign.hero
  const crops = cropCompareUrls(cloud, cropPhoto.public_id)
  const wide = `https://res.cloudinary.com/${cloud}/image/upload/e_pixelate_faces/c_limit,w_600,h_600/q_auto,f_auto/${cropPhoto.public_id}.jpg`

  return (
    <div className="grid gap-12">
      <ul className="flex list-none flex-wrap items-start gap-8 p-0">
        {KINDS.map((kind) => {
          const hindi = kind === "story_hi"
          const input = { ...en, before, kind, headline: hindi ? campaign.headline.hi : campaign.headline.en, subline: hindi ? campaign.subline.hi : campaign.subline.en, footer: hindi ? footerLine(campaign.project.name) : undefined }
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

      <section className="grid gap-4" aria-labelledby="ai-card-h">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id="ai-card-h" className="text-title">AI-extended story card</h3>
          <CloudinaryMark says="Cloudinary generative fill paints the missing edges instead of cropping the photo" />
        </div>
        <p className="max-w-[62ch] text-[15px] leading-6 text-fg-2">
          The photo is wide, but phone stories are tall. Instead of cutting the photo, Cloudinary AI painted the missing top and bottom.
          The dashed box is the real photo; everything outside it was made by AI. <b className="font-semibold text-fg">Campaign copy only, never used as evidence.</b>
        </p>
        <div className="flex flex-wrap items-start gap-8">
          <div className="grid gap-2.5">
            <span className="relative block border border-line bg-surface-2" style={{ width: 216, height: 384 }}>
              <RetryImage src={cardUrl(aiCard)} alt="Story card with edges extended by Cloudinary generative AI" width={216} height={384} waiting="Cloudinary AI is painting the edges. This takes a few seconds the first time." />
              {area && area.height < 99.5 && (
                <span aria-hidden="true" className="pointer-events-none absolute border-2 border-dashed border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]" style={{ top: `${area.top}%`, left: `${area.left}%`, width: `${area.width}%`, height: `${area.height}%` }} />
              )}
            </span>
            <span className="text-eyebrow !tracking-[0.1em]">{CARD_SIZES.story_ai.label}</span>
            <a href={cardUrl(aiCard, { download: "overlook-story-ai" })} className={buttonVariants({ variant: "outline", size: "sm" }) + " w-fit"}>Download</a>
          </div>
          <div className="grid max-w-[34ch] gap-3 text-[14px] leading-6 text-fg-2">
            <p><b className="font-semibold text-fg">Honest by design.</b> The card says &ldquo;Edges filled by AI&rdquo; in its corner, and faces are hidden after the fill, so invented areas are covered too.</p>
            <p>Overlook uses generative AI only to present evidence, never to change it. A photo that itself declares it was made with AI is flagged for review.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4" aria-labelledby="crop-h">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id="crop-h" className="text-title">Smart crop</h3>
          <CloudinaryMark says="Cloudinary finds the most important part of the photo and keeps it in frame" />
        </div>
        <p className="max-w-[62ch] text-[15px] leading-6 text-fg-2">
          The same photo cut to phone size two ways. A normal crop keeps the middle; Cloudinary&apos;s smart crop keeps what matters. All cards above use smart crop.
        </p>
        {/* one row on desktop (full photo, then the two crops at the same height); on phones the full photo gets its own row */}
        <div className="flex flex-wrap items-start gap-x-6 gap-y-5">
          <figure className="grid basis-full gap-2 sm:basis-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wide} alt="The full photo" loading="lazy" className="h-auto w-full border border-line bg-surface-2 sm:h-[240px] sm:w-auto" />
            <figcaption className="text-eyebrow !tracking-[0.1em]">The full photo</figcaption>
          </figure>
          {([["Normal crop", crops.plain], ["Cloudinary smart crop", crops.smart]] as const).map(([label, src]) => (
            <figure key={label} className="grid gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={label} width={135} height={240} loading="lazy" className="h-[240px] w-[135px] border border-line bg-surface-2" />
              <figcaption className="text-eyebrow max-w-[135px] !tracking-[0.1em]">{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  )
}
