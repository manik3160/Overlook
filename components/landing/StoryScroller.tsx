"use client"

import { useEffect, useRef, useState } from "react"
import StoryStage from "@/components/landing/StoryStage"
import { Eyebrow } from "@/components/ui/layout"
import { cn } from "@/lib/utils"

const STEPS = [
  { n: "01", title: <>Read <b>where</b> and <b>when</b>, before it leaves the phone.</>, body: "Location and time come from the file itself, read in the browser before upload. A forwarded WhatsApp image usually has none, and that gets said plainly: unverifiable, not fake.",
    facts: [["Taken", "3 Sep 2026, 10:12 IST"], ["GPS", "28.52511, 77.31622"], ["Stored", "Cloudinary · original untouched"]] },
  { n: "02", title: <>See <b>what&apos;s in it</b>, as things you can count.</>, body: "Each photo gets taxonomy tags, a one-line caption and six visual signals: garbage, vegetation, water, structure, people working, safety gear. The signals are what the impact numbers are built from.",
    facts: [["Tags", "cleanup drive · garbage present"], ["Signals", "garbage ✓ · vegetation sparse"], ["Cost", "once per photo, then cached"]] },
  { n: "03", title: <>Catch the photo that&apos;s <b>lying</b>.</>, body: "Its perceptual hash sits 3 bits from a photo uploaded a month earlier for another project. And it was taken 1.8 km from the site. Every deduction is shown with its evidence, so the score explains itself.",
    facts: [["Reused image", "distance 3 ≤ 6 · −40"], ["Outside site", "1,812 m / 500 m · −25"], ["Result", "35 · flagged for review"]] },
  { n: "04", title: <>Turn photos into <b>numbers you can click</b>.</>, body: "Photos from the same spot, days apart, pair up automatically. The scorecard compares before and after, and every fraction opens the exact photos behind it. Flagged and rejected photos never inflate the result.",
    facts: [["Garbage visible", "18/20 → 2/22"], ["Dense vegetation", "3/20 → 12/22"], ["Pairing", "≤ 50 m apart · ≥ 3 days"]] },
  { n: "05", title: <>Seal the report. <b>Anyone</b> can check it.</>, body: "The PDF carries a QR code. It opens a public page that recomputes the report's SHA-256 and traces every photo to its original and to the exact transformation used in print. Change one number and the seal breaks.",
    facts: [["Manifest", "sorted-key JSON"], ["Seal", "SHA-256 · recomputed live"], ["Faces", "pixelated in every public image"]] },
]
const LABELS = ["Capture", "Analyze", "Check", "Measure", "Prove"]
const clamp = (x: number) => Math.max(0, Math.min(1, x))

export default function StoryScroller() {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [view, setView] = useState({ ch: 0, p: 0 })

  useEffect(() => {
    let raf = 0
    const compute = () => {
      raf = 0
      const line = innerHeight * 0.55
      let ch = 0, p = 0
      refs.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.top < line) { ch = i; p = clamp((line - r.top) / r.height) }
      })
      p = Math.round(p * 200) / 200
      setView((v) => (v.ch === ch && v.p === p ? v : { ch, p }))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute) }
    compute()
    addEventListener("scroll", onScroll, { passive: true })
    addEventListener("resize", onScroll)
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf) }
  }, [])

  return (
    <section id="how" className={cn("story-section scroll-mt-16", view.ch === 4 && view.p > 0.08 && "is-cyan")} aria-labelledby="story-h">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-8">
        <div className="grid gap-3 pb-2 pt-[72px]">
          <Eyebrow mark>How a photo becomes evidence</Eyebrow>
          <h2 id="story-h" className="text-h1 max-w-[22ch]">Follow one photo. It looks fine. <b className="font-semibold">It isn&apos;t.</b></h2>
        </div>
        <div className="flex flex-col gap-6 min-[900px]:grid min-[900px]:grid-cols-12">
          <div className="min-[900px]:col-span-5">
            {STEPS.map((s, i) => (
              <article key={s.n} ref={(el) => { refs.current[i] = el }} data-step={i} className={cn("flex min-h-[78vh] flex-col justify-center gap-4 py-8 transition-opacity duration-[350ms] min-[900px]:min-h-[92vh] min-[900px]:py-12", view.ch === i ? "opacity-100" : "min-[900px]:opacity-[0.28]")}>
                <Eyebrow mark numbered>{`${s.n} · ${LABELS[i]}`}</Eyebrow>
                <h3 className="font-heading text-[clamp(30px,3.4vw,44px)] font-light leading-[1.05] tracking-[-0.03em] text-balance [&_b]:font-semibold">{s.title}</h3>
                <p className="max-w-[44ch] text-[17px] leading-[27px] text-fg-2 max-[899px]:text-base">{s.body}</p>
                <ul className="m-0 grid max-w-[44ch] list-none border-t border-line p-0">
                  {s.facts.map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-4 border-b border-line py-2 font-mono text-xs leading-[18px] [font-stretch:87.5%]">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-fg-3 [font-stretch:112.5%]">{k}</span><span className="text-right">{v}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="relative max-[899px]:sticky max-[899px]:top-[60px] max-[899px]:z-[5] max-[899px]:order-first max-[899px]:border-b max-[899px]:border-line max-[899px]:bg-bg max-[899px]:py-2 min-[900px]:col-span-6 min-[900px]:col-start-7">
            <div className="flex items-center justify-center max-[899px]:max-h-[52vh] max-[899px]:overflow-hidden min-[900px]:sticky min-[900px]:top-[76px] min-[900px]:h-[calc(100vh-100px)]">
              <StoryStage ch={view.ch} p={view.p} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
