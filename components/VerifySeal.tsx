"use client"

import { useEffect, useState } from "react"
import { Fingerprint } from "lucide-react"
import CopyButton from "@/components/CopyButton"
import { cn } from "@/lib/utils"

const blocks = (h: string) => h.match(/.{1,8}/g) ?? []
const HEX = "0123456789abcdef"

// The hash is compared on the server; this animation is cosmetic and says "we recomputed it" (DESIGN.md 7.14 + 9.2).
// The result text is in the DOM from the first render, so nothing depends on the animation.
export default function VerifySeal({ match, recorded, recomputed, headline, body, pdfHref }: {
  match: boolean; recorded: string; recomputed: string; headline: [string, string]; body: string; pdfHref?: string
}) {
  const rec = blocks(recorded)
  const fin = blocks(recomputed)
  const [shown, setShown] = useState<string[] | null>(null) // null = final state
  const [flash, setFlash] = useState<number[]>([])
  const [ruleOn, setRuleOn] = useState(true)

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timers: ReturnType<typeof setTimeout>[] = [setTimeout(() => { setRuleOn(false); setShown(fin.map(() => "········")) }, 0)]
    fin.forEach((b, i) => {
      timers.push(setTimeout(() => {
        const iv = setInterval(() => setShown((s) => s && s.map((x, j) => (j === i ? [...b].map(() => HEX[(Math.random() * 16) | 0]).join("") : x))), 20)
        timers.push(setTimeout(() => {
          clearInterval(iv)
          setShown((s) => s && s.map((x, j) => (j === i ? b : x)))
          if (b === rec[i]) { setFlash((f) => [...f, i]); timers.push(setTimeout(() => setFlash((f) => f.filter((x) => x !== i)), 180)) }
          if (i === fin.length - 1) setRuleOn(true)
        }, 60))
      }, i * 70))
    })
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on mount; idempotent so StrictMode's double run is safe
  }, [])

  return (
    <section role="status" aria-live="polite" className="relative grid gap-5 overflow-hidden rounded-md border border-line bg-surface-1 p-7 max-sm:p-5">
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1 origin-top transition-transform duration-200", match ? "bg-verified" : "bg-suspicious", ruleOn ? "scale-y-100" : "scale-y-0")} />
      <p className="text-eyebrow flex items-center gap-2"><Fingerprint size={14} strokeWidth={1.5} aria-hidden="true" />Report integrity · SHA-256</p>
      <div className="grid gap-2">
        <h1 className="text-h1">{headline[0]} <b className="font-semibold">{headline[1]}</b></h1>
        <p className="text-small max-w-[62ch]">{body}</p>
      </div>
      <div className="grid gap-3">
        <div className="grid gap-1 sm:grid-cols-[110px_1fr] sm:gap-3">
          <span className="text-eyebrow">Recorded</span>
          <span className="text-hash flex flex-wrap gap-x-2.5 gap-y-0.5">{rec.map((b, i) => <span key={i}>{b}</span>)}<CopyButton value={recorded} label="Copy recorded SHA-256" /></span>
        </div>
        <div className="grid gap-1 sm:grid-cols-[110px_1fr] sm:gap-3">
          <span className="text-eyebrow">Recomputed</span>
          <span className="text-hash flex flex-wrap gap-x-2.5 gap-y-0.5">
            <span className="sr-only">{recomputed}</span>
            <span aria-hidden="true" className="contents">
              {(shown ?? fin).map((b, i) => (
                <span key={i} className={cn("px-px transition-colors duration-150", flash.includes(i) && "bg-accent-tint")}>
                  {shown === null || b === fin[i] ? (
                    b === rec[i] ? b : [...b].map((ch, j) => (ch === rec[i]?.[j] ? ch : <u key={j} className="text-suspicious">{ch}</u>))
                  ) : b}
                </span>
              ))}
            </span>
            <CopyButton value={recomputed} label="Copy recomputed SHA-256" />
          </span>
        </div>
      </div>
      {pdfHref && <p><a href={pdfHref} className="text-[13px] text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink">Open the PDF report ↗</a></p>}
    </section>
  )
}
