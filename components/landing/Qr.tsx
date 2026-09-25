"use client"

import { useEffect, useRef } from "react"
import { rng } from "@/components/landing/scenes"

// A schematic QR (three finder squares plus seeded modules) for illustrations. It is not scannable and is only ever
// shown next to the words "illustrative" or "sample"; the real QR is generated inside the PDF report.
export default function Qr({ className = "size-[84px]" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const q = ref.current?.getContext("2d")
    if (!q) return
    const n = 25, s = 4, r = rng(2230)
    q.fillStyle = "#F3F1EA"; q.fillRect(0, 0, 100, 100); q.fillStyle = "#15140F"
    const inF = (x: number, y: number, a: number, b: number) => x >= a && x < a + 7 && y >= b && y < b + 7
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if (inF(x, y, 0, 0) || inF(x, y, 18, 0) || inF(x, y, 0, 18)) continue; if (r() > 0.52) q.fillRect(x * s, y * s, s, s) }
    for (const [a, b] of [[0, 0], [18, 0], [0, 18]]) {
      q.fillStyle = "#15140F"; q.fillRect(a * s, b * s, 7 * s, 7 * s)
      q.fillStyle = "#F3F1EA"; q.fillRect((a + 1) * s, (b + 1) * s, 5 * s, 5 * s)
      q.fillStyle = "#15140F"; q.fillRect((a + 2) * s, (b + 2) * s, 3 * s, 3 * s)
    }
  }, [])
  return <canvas ref={ref} width={100} height={100} className={className} aria-hidden="true" />
}
