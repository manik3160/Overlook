"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Info } from "lucide-react"
import TrustBadge from "@/components/TrustBadge"
import FlagIcon from "@/components/FlagIcon"
import { flagTitle } from "@/components/flag-copy"
import { deductionFor } from "@/components/FlagRow"
import { NO_METADATA_CAP, trustBand, type TrustFlag } from "@/lib/trust"

const TONE = { high: "text-suspicious", warning: "text-review", info: "text-fg-2" } as const
const HANDLED = new Set(["matchAssetId", "hammingDistance", "distanceM", "radiusM", "cap"])

function Evidence({ flag }: { flag: TrustFlag }) {
  const e = flag.evidence
  const bits: React.ReactNode[] = []
  if (typeof e.matchAssetId === "string") {
    bits.push(<span key="m">Matches <Link href={`/assets/${e.matchAssetId}`} className="text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink">an earlier upload ↗</Link>{typeof e.hammingDistance === "number" && ` · perceptual distance ${e.hammingDistance}`}</span>)
  }
  if (typeof e.distanceM === "number") bits.push(<span key="d">{Number(e.distanceM).toLocaleString("en-IN")} m from centre{typeof e.radiusM === "number" && ` · geofence ${e.radiusM} m`}</span>)
  const rest = Object.entries(e).filter(([k]) => !HANDLED.has(k))
  for (const [k, v] of rest) bits.push(<span key={k} className="font-mono text-xs">{k}: {String(v)}</span>)
  return bits.length ? <span className="text-small">{bits.map((b, i) => <span key={i} className="block">{b}</span>)}</span> : null
}

// The arithmetic behind trust_score (DESIGN.md 7.5 + 9.1). Rows come from trust_flags and the shared deduction constants.
export default function AuditTrace({ flags, score, hasExif, reviewStatus }: { flags: TrustFlag[]; score: number; hasExif: boolean; reviewStatus?: string }) {
  const deducting = flags.filter((f) => deductionFor(f.code) !== null)
  const infos = flags.filter((f) => deductionFor(f.code) === null)
  const before = 100 - deducting.reduce((n, f) => n + (deductionFor(f.code) ?? 0), 0)
  const capApplied = !hasExif && before > NO_METADATA_CAP

  const [shown, setShown] = useState(deducting.length) // rows visible; server render shows everything
  const [value, setValue] = useState(score)

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timers: ReturnType<typeof setTimeout>[] = [setTimeout(() => { setShown(0); setValue(100) }, 0)]
    let v = 100
    const targets = deducting.map((f) => (v -= deductionFor(f.code) ?? 0))
    targets.forEach((to, i) => {
      timers.push(setTimeout(() => {
        setShown(i + 1)
        const from = i === 0 ? 100 : targets[i - 1]
        const t0 = performance.now()
        const step = (t: number) => {
          const k = Math.min(1, (t - t0) / 220)
          setValue(Math.round(from + (to - from) * k))
          if (k < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }, 350 + i * 420))
    })
    timers.push(setTimeout(() => { setShown(deducting.length + 1); setValue(score) }, 350 + deducting.length * 420))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on mount; idempotent so StrictMode's double run is safe
  }, [])

  return (
    <div className="grid">
      <p className="sr-only" role="status">Trust score {score}, {trustBand(score)}. Starting at 100{deducting.map((f) => `, minus ${deductionFor(f.code)} ${flagTitle(f.code).toLowerCase()}`).join("")}.</p>
      <div aria-hidden="true" className="grid">
        <div className="grid grid-cols-[18px_1fr_auto] gap-2.5 border-b border-line py-2.5">
          <span />
          <span className="text-title font-medium">Starting score</span>
          <span className="text-right font-mono text-[13px] tabular-nums">100</span>
        </div>
        {deducting.map((f, i) => {
          return (
            <div key={i} className={`grid grid-cols-[18px_1fr_auto] items-start gap-2.5 border-b border-line py-2.5 transition-[opacity,transform] duration-200 ${i < shown ? "" : "translate-y-1 opacity-0"}`}>
              <FlagIcon code={f.code} className={`mt-1 ${TONE[f.severity]}`} />
              <span className="grid min-w-0 gap-0.5">
                <span>{flagTitle(f.code)}</span>
                <span className="hidden font-mono text-[9.5px] leading-[14px] tracking-[0.06em] text-fg-3 sm:block">{f.code}</span>
                <Evidence flag={f} />
              </span>
              <span className={`text-right font-mono text-[13px] leading-[22px] tabular-nums ${TONE[f.severity]}`}>−{deductionFor(f.code)}</span>
            </div>
          )
        })}
        {!hasExif && (
          <div className={`grid grid-cols-[18px_1fr] gap-2.5 border-b border-line py-2.5 transition-opacity duration-200 ${shown > deducting.length ? "" : "opacity-0"}`}>
            <Info size={16} strokeWidth={1.5} className="mt-1 text-fg-2" />
            <span className="text-small">Capped at {NO_METADATA_CAP}: no location or time metadata. This makes the photo unverifiable, not fake.{!capApplied && " Not applied here: the score is already below the cap."}</span>
          </div>
        )}
        {deducting.length === 0 && (
          <div className="grid grid-cols-[18px_1fr_auto] gap-2.5 border-b border-line py-2.5"><span /><span className="text-small">No checks failed</span><span className="text-right font-mono text-[13px]">100</span></div>
        )}
        {infos.filter((f) => f.code !== "NO_METADATA").map((f, i) => (
          <div key={i} className="grid grid-cols-[18px_1fr] gap-2.5 border-b border-line py-2.5">
            <Info size={16} strokeWidth={1.5} className="mt-1 text-fg-2" />
            <span className="text-small">{flagTitle(f.code)}: {f.reason}</span>
          </div>
        ))}
        <div className="-mt-px flex items-center justify-between border-t-2 border-fg pt-3">
          <span className="text-title">Trust score</span>
          <span className="flex items-center gap-3">
            <span className="font-mono text-[34px] font-light leading-9 tabular-nums">{value}</span>
            <TrustBadge score={value} reviewStatus={reviewStatus} size="lg" />
          </span>
        </div>
      </div>
    </div>
  )
}
