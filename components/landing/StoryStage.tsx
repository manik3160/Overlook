"use client"

import { useEffect, useRef } from "react"
import { Check } from "lucide-react"
import SampleCanvas from "@/components/landing/SampleCanvas"
import { rng } from "@/components/landing/scenes"
import { BA_ROWS, BITS_A, BITS_B, CASE, DIFF, REPORT_HASH } from "@/components/landing/story-data"
import TrustBadge from "@/components/TrustBadge"
import { cn } from "@/lib/utils"
import { NA } from "@/lib/copy"

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const on = (v: boolean) => (v ? "opacity-100" : "translate-y-[3px] opacity-0")
const REC = REPORT_HASH.match(/.{8}/g)!

function BitGrid({ bits, rows, diff }: { bits: number[]; rows: number; diff?: boolean }) {
  return (
    <div className="grid grid-cols-8 gap-0.5" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} className={cn("block size-[9px] border border-line-strong transition-[background-color,opacity] duration-150", b && "border-fg bg-fg", Math.floor(i / 8) >= rows && "opacity-[0.12]", diff && DIFF.includes(i) && rows === 8 && "outline outline-[1.5px] outline-offset-1 outline-suspicious")} />
      ))}
    </div>
  )
}

function Row({ k, v, show }: { k: string; v: React.ReactNode; show: boolean }) {
  return (
    <>
      <span className={cn("text-eyebrow !text-[9.5px] leading-[18px] transition-[opacity,transform] duration-[250ms]", on(show))}>{k}</span>
      <span className={cn("font-mono text-xs leading-[18px] [font-stretch:87.5%] transition-[opacity,transform] duration-[250ms]", on(show))}>{v}</span>
    </>
  )
}

function PhotoScene({ ch, p }: { ch: number; p: number }) {
  const caption = ch === 1 ? CASE.caption.slice(0, Math.round(CASE.caption.length * clamp((p - 0.46) / 0.36))) : ""
  const rows = ch === 2 ? Math.floor(clamp(p / 0.32) * 8) : 0
  const flagged = ch === 2 && p > 0.36
  const t = ch === 2 ? clamp((p - 0.44) / 0.2) : 0
  const px = 92 + (196 - 92) * t, py = 58 + (22 - 58) * t, out = t > 0.55
  const score = ch < 2 ? null : p > 0.64 ? 35 : p > 0.36 ? 60 : 100
  const fill = score === null ? "" : score >= 80 ? "bg-verified" : score >= 50 ? "bg-review" : "bg-suspicious"
  return (
    <div className="grid gap-3">
      <div className="relative">
        <SampleCanvas kind="before" seed={41} w={800} h={500} veil developed={false} />
        <span className={cn("crop-marks", flagged && "!opacity-100")} style={{ ["--mk" as string]: "var(--suspicious)" }} aria-hidden="true" />
        <span className={cn("pointer-events-none absolute inset-0 transition-opacity duration-300", ch < 2 && (ch === 1 || p > 0.45) ? "opacity-100" : "opacity-0")} aria-hidden="true">
          <i className="absolute inset-x-0 top-[58%] h-px bg-white/75" /><i className="absolute inset-y-0 left-[62%] w-px bg-white/75" />
          <span className="absolute left-[calc(62%+8px)] top-[calc(58%+8px)] bg-scrim px-1.5 py-[3px] font-mono text-[9.5px] leading-3 text-white">{CASE.gps}</span>
        </span>
        <span className="text-micro absolute left-2 top-2 bg-scrim px-1.5 py-[3px] text-white">{["01 · Capture", "02 · Analyze", "03 · Check"][ch]}</span>
        <span className={cn("text-micro absolute bottom-2 right-2 bg-[var(--flag)] px-1.5 py-[3px] text-white transition-[opacity,transform] duration-[250ms]", on(flagged && p > 0.64))}>Flagged for review</span>
        <span className="text-micro absolute bottom-2 left-2 text-white/60">Illustrative case</span>
      </div>

      {ch < 2 && (
        <div className="rounded-md border border-line bg-surface-1 px-4 py-3.5 max-[899px]:hidden">
          <p className={cn("font-mono text-xs leading-[18px] text-fg-3 transition-opacity duration-200", ch === 0 && p <= 0.08 ? "opacity-100" : "hidden opacity-0")}>Reading the file<span className="caret" /></p>
          <div className="grid grid-cols-[96px_1fr] items-baseline gap-x-3 gap-y-1">
            <Row k="Taken" v={CASE.takenAt} show={ch > 0 || p > 0.08} />
            <Row k="GPS" v={`${CASE.gps} · ±5 m`} show={ch > 0 || p > 0.26} />
            <Row k="Source" v="EXIF, read before upload" show={ch > 0 || p > 0.44} />
            <Row k="Tags" v={<><span className="text-data inline-flex h-[22px] items-center rounded-sm border border-line-strong px-2 text-fg-2">cleanup drive</span>{" "}<span className={cn("text-data inline-flex h-[22px] items-center rounded-sm border border-line-strong px-2 text-fg-2 transition-opacity", ch === 1 && p > 0.2 ? "opacity-100" : "opacity-0")}>garbage present</span></>} show={ch === 1 && p > 0.08} />
            <Row k="Signals" v={<>garbage <b>yes</b> · vegetation <b>sparse</b> · water <b>yes</b> · people <b>0</b></>} show={ch === 1 && p > 0.34} />
            <Row k="Caption" v={<span className={cn(ch === 1 && caption.length > 0 && caption.length < CASE.caption.length && "caret")}>{caption}</span>} show={ch === 1 && p > 0.46} />
          </div>
        </div>
      )}

      {ch === 2 && (
        <div className="grid gap-3 rounded-md border border-line bg-surface-1 px-4 py-3.5 sm:grid-cols-[auto_1fr] max-[899px]:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1"><span className="text-micro text-fg-3">This photo</span><BitGrid bits={BITS_A} rows={rows} diff /></div>
            <div className="grid gap-1"><span className="text-micro text-fg-3">img_0412 · 4 Aug</span><BitGrid bits={BITS_B} rows={rows} diff /></div>
            <div className="grid"><span className="text-micro text-fg-3">Distance</span><span className="font-mono text-[28px] font-light leading-8" style={{ color: p > 0.34 ? "var(--suspicious)" : undefined }}>{p > 0.34 ? CASE.hamming : NA}</span></div>
          </div>
          <svg viewBox="0 0 220 120" className="block h-auto w-full max-w-[220px]" aria-hidden="true">
            <rect x="0" y="0" width="220" height="120" fill="none" stroke="var(--line)" />
            <circle cx="80" cy="62" r="40" fill="var(--accent-ink)" fillOpacity=".07" stroke="var(--accent-ink)" strokeWidth="1.2" strokeDasharray="3 3" />
            <path d="M76 62h8M80 58v8" stroke="var(--fg)" />
            <text x="44" y="116" fontFamily="var(--font-data), monospace" fontSize="7" fill="var(--fg-3)">GEOFENCE 500 M</text>
            <line x1="80" y1="62" x2={px} y2={py} stroke="var(--suspicious)" strokeDasharray="2 2" />
            <circle cx={px} cy={py} r="4.5" fill={out ? "var(--suspicious)" : "var(--verified)"} stroke="var(--bg)" strokeWidth="1.5" />
            <text x="150" y="24" fontFamily="var(--font-data), monospace" fontSize="8" fill="var(--suspicious)" opacity={out ? 1 : 0}>1,812 m</text>
          </svg>
          <div className={cn("flex items-baseline justify-between gap-3 border-t border-line pt-2 transition-opacity duration-[250ms] sm:col-span-2", p > 0.36 ? "opacity-100" : "opacity-0")}><span className="text-small text-fg">Near-identical to an earlier photo</span><span className="font-mono text-xs text-suspicious">−40</span></div>
          <div className={cn("flex items-baseline justify-between gap-3 border-t border-line pt-2 transition-opacity duration-[250ms] sm:col-span-2", p > 0.64 ? "opacity-100" : "opacity-0")}><span className="text-small text-fg">Taken outside the site · 1,812 m</span><span className="font-mono text-xs text-review">−25</span></div>
        </div>
      )}

      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3.5 rounded-md border border-line bg-surface-1 px-4 py-3">
        <span className="text-eyebrow">Trust</span>
        <span className="relative h-1.5 bg-surface-3">
          <span className={cn("absolute inset-y-0 left-0 transition-[width,background-color] duration-300", fill)} style={{ width: `${score ?? 0}%` }} />
          {[50, 80].map((tk) => <span key={tk} className="absolute -top-0.5 h-2.5 w-px bg-line-strong" style={{ left: `${tk}%` }} />)}
        </span>
        <span className="min-w-[2.2ch] text-right font-mono text-[28px] font-light leading-[30px] tabular-nums">{score ?? NA}</span>
        <TrustBadge score={score} />
      </div>
    </div>
  )
}

function BeforeAfterScene({ p }: { p: number }) {
  const k = clamp(p / 0.75)
  const pos = 88 - 76 * k
  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/3] max-w-full overflow-hidden bg-surface-2">
        <SampleCanvas kind="after" seed={21} w={800} h={600} className="absolute inset-0 !aspect-auto size-full" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><SampleCanvas kind="before" seed={21} w={800} h={600} className="absolute inset-0 !aspect-auto size-full" /></div>
        <span className="text-micro absolute left-2 top-2 bg-scrim px-1.5 py-[3px] text-white">Before · 4 Aug</span>
        <span className="text-micro absolute right-2 top-2 bg-scrim px-1.5 py-[3px] text-white">After · 11 Sep</span>
        <span className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.3)]" style={{ left: `${pos}%` }} />
        <span className="absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm bg-fg text-bg" style={{ left: `${pos}%` }}><span className="font-mono text-[11px]">↔</span></span>
      </div>
      <div className="rounded-md border border-line bg-surface-1 px-4 py-1">
        {BA_ROWS.map(([label, bh, bt, ah, at]) => {
          const v = Math.round((bh / bt) * at + (ah - (bh / bt) * at) * k)
          return (
            <div key={label} className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-3 border-b border-line py-2.5 last:border-b-0">
              <span className="text-small text-fg">{label}</span>
              <span className="font-mono text-xs">{bh}/{bt}<span className="ml-2 inline-block h-1 w-14 bg-surface-3 align-middle"><i className="block h-full bg-fg-3" style={{ width: `${(bh / bt) * 100}%` }} /></span></span>
              <span className="font-mono text-xs">{v}/{at}<span className="ml-2 inline-block h-1 w-14 bg-surface-3 align-middle"><i className="block h-full bg-fg" style={{ width: `${(v / at) * 100}%` }} /></span></span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Qr() {
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
  return <canvas ref={ref} width={100} height={100} className="size-[84px]" aria-hidden="true" />
}

function ReportScene({ p }: { p: number }) {
  const n = Math.floor(clamp(p / 0.7) * 8)
  const k = clamp((p - 0.72) / 0.16)
  return (
    <div className="grid gap-3">
      <div className="grid -rotate-[1.2deg] grid-cols-[1fr_auto] gap-x-5 gap-y-3.5 bg-paper p-[22px] pb-[18px] text-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] max-[899px]:rotate-0 max-[899px]:gap-y-2 max-[899px]:p-3">
        <div className="grid gap-1.5">
          <span className="font-mono text-[9px] uppercase leading-[14px] tracking-[0.14em] text-[#6D6B64]">Donor report · sealed</span>
          <h4 className="m-0 font-heading text-xl font-semibold leading-6 tracking-[-0.01em] max-[899px]:text-base max-[899px]:leading-5">Yamuna ghat cleanup</h4>
          <span className="font-mono text-[9px] uppercase leading-[14px] tracking-[0.06em] text-[#6D6B64]">3 Aug → 14 Sep 2026 · 24 photos</span>
        </div>
        <div className="grid justify-items-center gap-1 max-[899px]:[&_canvas]:size-14"><Qr /><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#6D6B64]">Scan to verify</span></div>
        <div className="col-span-full grid border-t border-[#D8D5CC] max-[899px]:hidden">
          {[["Garbage visible", "18/20 → 2/22"], ["Dense vegetation", "3/20 → 12/22"], ["Evidence coverage", "78% · avg trust 81"]].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-[#D8D5CC] py-[5px] font-mono text-[11px] leading-4 [font-stretch:87.5%]"><span>{a}</span><span>{b}</span></div>
          ))}
        </div>
      </div>
      <div className="grid gap-2.5 rounded-md border border-line bg-surface-1 p-4 max-[899px]:gap-2 max-[899px]:p-3">
        <div className="grid gap-1 sm:grid-cols-[96px_1fr] sm:gap-3 max-[899px]:hidden"><span className="text-eyebrow">Recorded</span><span className="text-hash flex flex-wrap gap-x-2.5">{REC.map((b, i) => <span key={i}>{b}</span>)}</span></div>
        <div className="grid gap-1 sm:grid-cols-[96px_1fr] sm:gap-3"><span className="text-eyebrow">Recomputed</span><span className="text-hash flex flex-wrap gap-x-2.5">{REC.map((b, i) => <span key={i} className={i < n ? "bg-accent-tint" : "opacity-40"}>{i < n ? b : "········"}</span>)}</span></div>
        <div className="grid grid-cols-[96px_1fr] items-center gap-4 max-[899px]:grid-cols-[56px_1fr] max-[899px]:gap-3">
          <svg viewBox="0 0 100 100" className="size-24 max-[899px]:size-14" aria-hidden="true">
            <defs><path id="ringpath" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" /></defs>
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--line-strong)" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--verified)" strokeWidth="2" strokeDasharray="289" strokeDashoffset={289 * (1 - k)} transform="rotate(-90 50 50)" />
            <text fontFamily="var(--font-data), monospace" fontSize="6.4" letterSpacing="1.6" fill="var(--fg-2)"><textPath href="#ringpath">SHA-256 · MATCH · OVERLOOK · SEALED ·</textPath></text>
            <g style={{ opacity: k >= 1 ? 1 : 0, transition: "opacity .3s" }}><rect x="38" y="38" width="24" height="24" fill="var(--verified)" /><path d="M43 50.5l4.5 4.5L57 45.5" fill="none" stroke="var(--cy)" strokeWidth="3" /></g>
          </svg>
          <div className="grid gap-1"><span className="text-h2 flex items-center gap-2">{k >= 1 && <Check size={18} strokeWidth={2.5} className="text-verified" aria-hidden="true" />}{k >= 1 ? "Report unchanged" : n >= 8 ? "Match. Sealing…" : `Recomputing… ${n}/8 blocks`}</span><span className="text-small max-[899px]:hidden">A judge scans the QR and sees this on their phone.</span></div>
        </div>
      </div>
    </div>
  )
}

// Pure function of (chapter, progress): scrolling back up replays each moment correctly (DESIGN.md 8.0).
export default function StoryStage({ ch, p }: { ch: number; p: number }) {
  return (
    <div className="relative w-full max-w-[640px]" aria-hidden="true">
      <div className={cn(ch <= 2 ? "block" : "hidden")}><PhotoScene ch={Math.min(ch, 2)} p={p} /></div>
      <div className={cn(ch === 3 ? "block" : "hidden")}><BeforeAfterScene p={p} /></div>
      <div className={cn(ch === 4 ? "block" : "hidden")}><ReportScene p={p} /></div>
    </div>
  )
}
