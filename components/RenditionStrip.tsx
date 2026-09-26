import type { Rendition } from "@/lib/renditions"
import BeforeAfterSlider from "@/components/BeforeAfterSlider"
import CloudinaryMark from "@/components/CloudinaryMark"
import { Eyebrow } from "@/components/ui/layout"

// "What Cloudinary made from this photo": one upload, every version the app uses, each with a plain sentence.
// The transformation "recipe" is there for the curious, folded away.
export default function RenditionStrip({ renditions, enhance }: { renditions: Rendition[]; enhance?: { before: string; after: string } }) {
  const derived = renditions.length - 1
  return (
    <section className="mt-16 grid gap-5" aria-labelledby="rend-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2.5">
          <Eyebrow>From one upload</Eyebrow>
          <h2 id="rend-h" className="text-h2">What Cloudinary made from this photo</h2>
          <p className="max-w-[62ch] text-[15px] leading-6 text-fg-2">
            One file was uploaded. Cloudinary makes the {derived} other versions on the fly, just from a web address, and never changes the original.
            Every version below is the real one this app uses.
          </p>
        </div>
        <CloudinaryMark says="Every version is made by Cloudinary from the one original, on request" />
      </div>
      <ul className="grid list-none grid-cols-2 gap-x-5 gap-y-8 p-0 sm:grid-cols-3 lg:grid-cols-4">
        {renditions.map((r) => (
          <li key={r.key} className="grid content-start gap-2">
            <a href={r.url} target="_blank" rel="noreferrer" className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-2 p-2 hover:border-fg-3">
              {r.key === "original" && r.url.match(/\.(mp4|mov|webm)$/i) ? (
                <span className="text-small">video file</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.preview} alt={r.label} loading="lazy" className={r.key === "blur" ? "size-28 rounded-sm" /* the 24 px file, enlarged so its blur is visible */ : "max-h-full max-w-full object-contain"} />
              )}
            </a>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <b className="text-[15px] font-semibold">{r.label}</b>
              <span className="text-data text-fg-3">{r.size}</span>
            </div>
            <p className="text-[13.5px] leading-5 text-fg-2">{r.sentence}</p>
            {r.pixelated && <span className="text-eyebrow w-fit !tracking-[0.08em] text-fg-2">Faces hidden</span>}
            <details className="text-[12.5px] text-fg-3">
              <summary className="cursor-pointer select-none hover:text-fg">{r.recipe ? "Show recipe" : "No recipe: this is the original"}</summary>
              {r.recipe && <code className="mt-1.5 block break-all rounded-sm bg-surface-2 p-2 font-mono text-[11.5px] leading-4 text-fg-2">{r.recipe}</code>}
            </details>
          </li>
        ))}
      </ul>
      {enhance && (
        <div className="mt-4 grid max-w-[640px] gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-title">Brightened by Cloudinary AI</h3>
            <CloudinaryMark says="Cloudinary AI improves light and colour for campaign copies; the evidence original is not changed" />
          </div>
          <p className="text-[15px] leading-6 text-fg-2">Drag the line. Left: as uploaded. Right: improved by Cloudinary AI for campaign use. Dark field photos gain the most.</p>
          <BeforeAfterSlider beforeUrl={enhance.before} afterUrl={enhance.after} beforeLabel="As uploaded" afterLabel="AI-enhanced" />
        </div>
      )}
    </section>
  )
}
