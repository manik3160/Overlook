"use client"

import { useEffect, useRef } from "react"
import { paintScene, type SceneKind } from "@/components/landing/scenes"
import { cn } from "@/lib/utils"

// A sample photo. With `veil`, a second copy carries the cyanotype filter and fades out when `developed` (DESIGN.md 4.9).
export default function SampleCanvas({ kind, seed, w = 240, h = 180, veil = false, developed = false, className }: {
  kind: SceneKind; seed: number; w?: number; h?: number; veil?: boolean; developed?: boolean; className?: string
}) {
  const a = useRef<HTMLCanvasElement>(null)
  const b = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (a.current) paintScene(a.current, kind, seed)
    if (b.current) paintScene(b.current, kind, seed)
  }, [kind, seed])
  return (
    <span className={cn("relative block overflow-hidden bg-surface-2", className)} style={{ aspectRatio: `${w} / ${h}` }}>
      <canvas ref={a} width={w} height={h} className="absolute inset-0 size-full" aria-hidden="true" />
      {veil && <canvas ref={b} width={w} height={h} aria-hidden="true" className="absolute inset-0 size-full transition-opacity duration-[1200ms] ease-[var(--ease)]" style={{ filter: "url(#cyanotype)", opacity: developed ? 0 : 1 }} />}
    </span>
  )
}
