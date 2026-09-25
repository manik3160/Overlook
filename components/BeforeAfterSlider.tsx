"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronsLeftRight } from "lucide-react"
import SafeImg from "@/components/SafeImg"

type Props = { beforeUrl: string; afterUrl: string; beforeLabel?: string; afterLabel?: string; nudge?: boolean }

// Drag anywhere, click to jump, or use the handle with the keyboard. Left of the line is BEFORE, right is AFTER (same crop).
// `nudge` plays a one-time 50 -> 32 -> 50 hint the first time it scrolls into view (DESIGN.md 9.3).
export default function BeforeAfterSlider({ beforeUrl, afterUrl, beforeLabel, afterLabel, nudge = false }: Props) {
  const [pos, setPos] = useState(50)
  const frame = useRef<HTMLDivElement>(null)
  const played = useRef(false)

  useEffect(() => {
    const el = frame.current
    if (!nudge || !el || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || played.current) return
      played.current = true
      io.disconnect()
      const t0 = performance.now()
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 900)
        setPos(50 - 18 * Math.sin(k * Math.PI))
        if (k < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [nudge])

  const clamp = (n: number) => Math.max(0, Math.min(100, n))
  const fromPointer = (e: React.PointerEvent) => {
    const b = frame.current!.getBoundingClientRect()
    setPos(clamp(((e.clientX - b.left) / b.width) * 100))
  }
  function onKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 20 : 5
    const next = e.key === "ArrowLeft" ? pos - step : e.key === "ArrowRight" ? pos + step : e.key === "Home" ? 0 : e.key === "End" ? 100 : null
    if (next !== null) { e.preventDefault(); setPos(clamp(next)) }
  }

  return (
    <div
      ref={frame}
      className="relative aspect-[4/3] max-w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-surface-2"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e) }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e) }}
    >
      <SafeImg src={afterUrl} alt={afterLabel ? `After, ${afterLabel}` : "After"} className="pointer-events-none absolute inset-0 size-full object-cover" />
      <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <SafeImg src={beforeUrl} alt={beforeLabel ? `Before, ${beforeLabel}` : "Before"} className="absolute inset-0 size-full object-cover" />
      </div>
      <span className="text-micro pointer-events-none absolute left-2 top-2 bg-scrim px-1.5 py-[3px] text-white">Before{beforeLabel ? ` · ${beforeLabel}` : ""}</span>
      <span className="text-micro pointer-events-none absolute right-2 top-2 bg-scrim px-1.5 py-[3px] text-white">After{afterLabel ? ` · ${afterLabel}` : ""}</span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.3)]" style={{ left: `${pos}%` }} />
      <span
        role="slider"
        tabIndex={0}
        aria-label="Before and after comparison"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% before`}
        onKeyDown={onKey}
        className="absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm bg-fg text-bg outline-none focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent-ink"
        style={{ left: `${pos}%` }}
      >
        <ChevronsLeftRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </span>
    </div>
  )
}
