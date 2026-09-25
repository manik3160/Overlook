"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, RotateCcw } from "lucide-react"
import SampleCanvas from "@/components/landing/SampleCanvas"
import Qr from "@/components/landing/Qr"
import { REPORT_HASH } from "@/components/landing/story-data"
import TrustBadge from "@/components/TrustBadge"
import { cn } from "@/lib/utils"

const FRAMES = [
  ["01", "Upload", "Photos and video with GPS and time, read before they leave the device."],
  ["02", "Analyze", "Tags, a caption and six visual signals, cached so nothing is paid for twice."],
  ["03", "Score", "A trust score with plain-language reasons, and a human review queue. Here: 65, needs review, because it looks like a photo of a screen."],
  ["04", "Prove", "A PDF with a QR code that anyone can scan to verify."],
] as const

const CAPTION = "A laptop screen showing a beach photo."
const STEP_MS = 950
const clamp = (x: number) => Math.max(0, Math.min(1, x))

// One sample photo travels across four film frames and changes at each stage (DESIGN.md 8.1).
// Plays once when scrolled into view; the four captions are real text, so nothing depends on the animation.
export default function DarkroomStrip() {
  const root = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  // stage: -1 = not started, 0..3 = frame being played, 4 = all finished
  const [stage, setStage] = useState(-1)
  // t: 0..1 progress inside the active frame (drives typing and the score count)
  const [t, setT] = useState(0)

  const clear = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = [] }, [])

  // Plays frame i, then (optionally) the frames after it, as one flat list of timers. No recursion.
  const play = useCallback((from: number, through: number) => {
    clear()
    for (let i = from; i <= through; i++) {
      const start = (i - from) * STEP_MS
      timers.current.push(setTimeout(() => {
        setStage(i)
        // On phones the strip scrolls sideways: follow the active frame so the story is visible during playback.
        const track = root.current?.querySelector<HTMLElement>(".filmstrip-track")
        const frame = root.current?.querySelectorAll<HTMLElement>(".filmstrip-frame")[i]
        if (track && frame && track.scrollWidth > track.clientWidth + 1) {
          track.scrollTo({ left: frame.offsetLeft - 8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
        }
        const t0 = performance.now()
        const tick = (now: number) => {
          const k = clamp((now - t0) / (STEP_MS * 0.85))
          setT(k)
          if (k < 1) timers.current.push(setTimeout(() => requestAnimationFrame(tick), 0))
        }
        requestAnimationFrame(tick)
      }, start))
    }
    timers.current.push(setTimeout(() => { setT(1); setStage(4) }, (through - from + 1) * STEP_MS))
  }, [clear])

  const playAll = useCallback(() => play(0, 3), [play])

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { const id = setTimeout(() => setStage(4), 0); return () => clearTimeout(id) }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { io.disconnect(); playAll() }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); clear() }
  }, [playAll, clear])

  // Visual state of frame i: finished frames are complete, the active frame follows t, later frames are idle.
  const done = (i: number) => stage === 4 || stage > i
  const prog = (i: number) => (done(i) ? 1 : stage === i ? t : 0)
  const started = stage >= 0

  const score = Math.round(100 - 35 * prog(2))
  const typed = Math.round(CAPTION.length * clamp((prog(1) - 0.25) / 0.7))
  const marked = prog(2) > 0.35
  const hashN = Math.round(clamp(prog(3) / 0.7) * 8)
  const REC = REPORT_HASH.match(/.{8}/g)!

  return (
    <div ref={root} className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3">
      <div className="filmstrip" role="group" aria-label="One sample photo moving through the four steps, with sprocket holes like a film strip">
        <div className="filmstrip-track">
          <ol className="filmstrip-frames" aria-label="How a photo becomes evidence, in four steps">
            {FRAMES.map(([n, title, text], i) => (
              <li
                key={n}
                className={cn("filmstrip-frame", stage === i && "is-active")}
                onMouseEnter={() => stage === 4 && play(i, i)}
              >
                <div className="relative" aria-hidden="true">
                  {i < 3 ? (
                    <div className="relative">
                      <SampleCanvas kind="screen" seed={5} w={320} h={240} veil developed={false} />
                      <span className={cn("crop-marks", i === 2 && marked && "!opacity-100")} style={{ ["--mk" as string]: "var(--suspicious)" }} />
                      {i === 0 && (
                        <span className={cn("text-micro absolute left-1.5 top-1.5 bg-scrim px-1.5 py-[3px] text-white transition-opacity duration-200", started ? "opacity-100" : "opacity-60")}>Pending</span>
                      )}
                      {i === 2 && (
                        <span className={cn("text-micro absolute bottom-1.5 left-1.5 bg-[var(--flag)] px-1.5 py-[3px] text-white transition-[opacity,transform] duration-200", marked ? "opacity-100" : "translate-y-0.5 opacity-0")}>Photo of a screen</span>
                      )}
                    </div>
                  ) : (
                    <div className="grid aspect-[4/3] -rotate-1 grid-cols-[1fr_auto] content-start gap-x-3 gap-y-2 bg-paper p-3 text-ink shadow-[0_18px_40px_-24px_rgb(0_0_0/0.7)] max-[520px]:rotate-0">
                      <div className="grid gap-1">
                        <span className="font-mono text-[8px] uppercase leading-3 tracking-[0.14em] text-[#6D6B64]">Donor report · sealed</span>
                        <span className="font-heading text-sm font-semibold leading-4">Yamuna ghat cleanup</span>
                      </div>
                      <Qr className="size-[52px]" />
                      <div className="col-span-2 flex flex-wrap gap-x-1.5 font-mono text-[9px] leading-[13px] [font-stretch:75%]">
                        {REC.slice(0, 4).map((b, k) => <span key={k} className={cn("transition-opacity duration-150", k < hashN ? "opacity-100" : "opacity-25")}>{k < hashN ? b : "········"}</span>)}
                      </div>
                      <span className={cn("col-span-2 inline-flex items-center gap-1.5 font-heading text-[13px] font-semibold transition-opacity duration-200", prog(3) > 0.75 ? "opacity-100" : "opacity-0")}>
                        <Check size={14} strokeWidth={3} className="text-[#237A4B]" />Report unchanged
                      </span>
                    </div>
                  )}
                </div>

                <div className="filmstrip-readout" aria-hidden="true">
                  {i === 0 && (
                    <>
                      <span>img_2041.jpg · 3.1 MB</span>
                      <span className={cn("transition-opacity duration-200", prog(0) > 0.35 ? "opacity-100" : "opacity-0")}>GPS 28.52511, 77.31622</span>
                      <span className={cn("transition-opacity duration-200", prog(0) > 0.6 ? "opacity-100" : "opacity-0")}>3 Sep 2026, 10:12 IST</span>
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <span className={cn("transition-opacity duration-200", prog(1) > 0.1 ? "opacity-100" : "opacity-0")}><span className="rounded-sm border border-line-strong px-1.5">water body</span></span>
                      <span className={cn(typed > 0 && typed < CAPTION.length && "caret")}>{CAPTION.slice(0, typed)}</span>
                      <span className={cn("transition-opacity duration-200", prog(1) > 0.85 ? "opacity-100" : "opacity-0")}>water yes · people 0</span>
                    </>
                  )}
                  {i === 2 && (
                    <>
                      <span className="flex items-center gap-2"><span className="min-w-[2ch] text-[22px] font-light leading-6 tabular-nums text-fg">{prog(2) > 0 ? score : ""}</span><TrustBadge score={prog(2) > 0.1 ? score : null} /></span>
                      <span className={cn("text-suspicious transition-opacity duration-200", marked ? "opacity-100" : "opacity-0")}>Looks like a photo of a screen, -35</span>
                    </>
                  )}
                  {i === 3 && <span>SHA-256 recomputed on every visit</span>}
                </div>

                <div className="mt-3 grid gap-1">
                  <h3 className="text-title"><span className="mr-2 font-mono text-[11px] font-medium text-fg-3">{n}</span>{title}</h3>
                  <p className="text-small">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-eyebrow !tracking-[0.1em]">Illustrative sample. Blue means not yet verified.</p>
        <button type="button" onClick={playAll} className="inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[12.5px] font-medium text-fg-2 hover:bg-surface-2 hover:text-fg">
          <RotateCcw size={13} strokeWidth={1.5} aria-hidden="true" />Replay
        </button>
      </div>
    </div>
  )
}
