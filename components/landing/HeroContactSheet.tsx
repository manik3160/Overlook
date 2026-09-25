"use client"

import { useEffect, useState } from "react"
import SampleCanvas from "@/components/landing/SampleCanvas"
import { HERO_FRAMES } from "@/components/landing/story-data"
import { cn } from "@/lib/utils"

// Frames start as cyanotypes and develop one by one; the flagged ones stay blue and get red crop marks (DESIGN.md 9.4).
export default function HeroContactSheet() {
  const [done, setDone] = useState(0)
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    const timers = still ? [setTimeout(() => setDone(HERO_FRAMES.length), 0)] : HERO_FRAMES.map((_, i) => setTimeout(() => setDone(i + 1), 500 + i * 170))
    return () => timers.forEach(clearTimeout)
  }, [])
  const flagged = HERO_FRAMES.slice(0, done).filter((f) => f.flag).length
  return (
    <figure aria-label="Contact sheet of 12 sample field photos. Nine develop into colour once verified; three stay undeveloped and are flagged for review." className="m-0 grid gap-2.5 border border-line bg-surface-1 p-3.5 pb-2.5">
      <div className="text-eyebrow flex justify-between text-[9.5px]"><span>Roll 01 · Yamuna ghat</span><span>12 frames · sample</span></div>
      <ul className="grid list-none grid-cols-4 gap-x-2 gap-y-2.5 p-0">
        {HERO_FRAMES.map((f, i) => {
          const shown = i < done
          const isFlag = !!f.flag
          return (
            <li key={i} className="grid gap-1">
              <span className="relative block">
                <SampleCanvas kind={f.kind} seed={f.seed} veil developed={shown && !isFlag} />
                <span className={cn("crop-marks", shown && isFlag && "!opacity-100")} style={{ ["--mk" as string]: "var(--suspicious)" }} aria-hidden="true" />
                {isFlag && (
                  <span className={cn("text-micro absolute bottom-1 left-1 max-w-[calc(100%-8px)] bg-[var(--flag)] px-1 py-0.5 text-[8px] leading-3 text-white transition-[opacity,transform] duration-200", shown ? "opacity-100" : "translate-y-0.5 opacity-0")}>{f.flag}</span>
                )}
              </span>
              <span className="font-mono text-[9px] leading-3 text-fg-3">{String(i + 1).padStart(2, "0")} · {isFlag ? "FLAGGED" : f.date}</span>
            </li>
          )
        })}
      </ul>
      <div className="text-eyebrow flex justify-between text-[9.5px]" aria-hidden="true"><span>Blue = not yet verified</span><span>{done} / 12 checked · {flagged} flagged</span></div>
    </figure>
  )
}
