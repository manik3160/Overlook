"use client"

import { useEffect, useState } from "react"
import SampleCanvas from "@/components/landing/SampleCanvas"
import { HERO_FRAMES } from "@/components/landing/story-data"
import { cn } from "@/lib/utils"

type Frame = (typeof HERO_FRAMES)[number]
const COLS = { 3: "grid-cols-3", 4: "grid-cols-4" } as const

// Illustrative contact sheet: frames start as blue cyanotypes and develop one by one (DESIGN.md 4.9).
// mode "develop": frames with a `flag` stay blue with red crop marks. mode "clear": nothing is flagged.
// Always labelled as a sample; drawn on canvas, so it costs no images and no quota.
export default function SampleSheet({ frames = HERO_FRAMES, cols = 4, edgeTop, legend = "Blue = not yet verified", mode = "develop", ariaLabel }: {
  frames?: Frame[]; cols?: 3 | 4; edgeTop: [string, string]; legend?: string; mode?: "develop" | "clear"; ariaLabel: string
}) {
  const [done, setDone] = useState(0)
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    const timers = still ? [setTimeout(() => setDone(frames.length), 0)] : frames.map((_, i) => setTimeout(() => setDone(i + 1), 500 + i * 170))
    return () => timers.forEach(clearTimeout)
  }, [frames])
  const isFlag = (f: Frame) => mode === "develop" && !!f.flag
  const flagged = frames.slice(0, done).filter(isFlag).length
  return (
    <figure aria-label={ariaLabel} className="m-0 grid gap-2.5 border border-line bg-surface-1 p-3.5 pb-2.5">
      <div className="text-eyebrow flex justify-between text-[9.5px]"><span>{edgeTop[0]}</span><span>{edgeTop[1]}</span></div>
      <ul className={cn("grid list-none gap-x-2 gap-y-2.5 p-0", COLS[cols])}>
        {frames.map((f, i) => {
          const shown = i < done
          const flag = isFlag(f)
          return (
            <li key={i} className="grid gap-1">
              <span className="relative block">
                <SampleCanvas kind={f.kind} seed={f.seed} veil developed={shown && !flag} />
                <span className={cn("crop-marks", shown && flag && "!opacity-100")} style={{ ["--mk" as string]: "var(--suspicious)" }} aria-hidden="true" />
                {flag && (
                  <span className={cn("text-micro absolute bottom-1 left-1 max-w-[calc(100%-8px)] bg-[var(--flag)] px-1 py-0.5 text-[8px] leading-3 text-white transition-[opacity,transform] duration-200", shown ? "opacity-100" : "translate-y-0.5 opacity-0")}>{f.flag}</span>
                )}
              </span>
              <span className="font-mono text-[9px] leading-3 text-fg-3">{String(i + 1).padStart(2, "0")} · {flag ? "FLAGGED" : f.date}</span>
            </li>
          )
        })}
      </ul>
      <div className="text-eyebrow flex justify-between text-[9.5px]" aria-hidden="true"><span>{legend}</span><span>{done} / {frames.length} checked · {flagged} flagged</span></div>
    </figure>
  )
}
