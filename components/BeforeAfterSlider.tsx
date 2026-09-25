"use client"

import { useState } from "react"

type Props = { beforeUrl: string; afterUrl: string; beforeLabel: string; afterLabel: string }

// Drag the slider: left of the line shows BEFORE, right shows AFTER (same crop for both).
export default function BeforeAfterSlider({ beforeUrl, afterUrl, beforeLabel, afterLabel }: Props) {
  const [pos, setPos] = useState(50)
  return (
    <div className="max-w-xl space-y-1 text-xs">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={afterUrl} alt={`After, ${afterLabel}`} className="absolute inset-0 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeUrl} alt={`Before, ${beforeLabel}`} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pos}%` }} />
        <span className="absolute left-1 top-1 bg-black/60 px-1 text-white">Before</span>
        <span className="absolute right-1 top-1 bg-black/60 px-1 text-white">After</span>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Slide between before and after" className="w-full" />
      <div className="flex justify-between"><span>Before: {beforeLabel}</span><span>After: {afterLabel}</span></div>
    </div>
  )
}
