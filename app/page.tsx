import Link from "next/link"
import type { Metadata } from "next"
import HeroContactSheet from "@/components/landing/HeroContactSheet"
import StoryScroller from "@/components/landing/StoryScroller"
import BriefLedger from "@/components/landing/BriefLedger"
import Wordmark from "@/components/shell/Wordmark"
import ThemeToggle from "@/components/shell/ThemeToggle"
import { SealMark } from "@/components/shell/Wordmark"
import { buttonVariants } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/layout"
import { selectAll, supabase } from "@/lib/supabase"
import { computeStats } from "@/lib/stats"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: { absolute: "Overlook · verified field evidence" } }

const PROOF: [string, string][] = [
  ["8", "trust checks on every photo, each with a reason"],
  ["64-bit", "perceptual hash to catch reused images"],
  ["0", "AI calls ever repeated: results are cached"],
  ["SHA-256", "seal on every report, checkable by QR"],
]

// Live numbers for the closing call to action. If the database is unreachable the page still renders.
async function liveNumbers() {
  try {
    const [{ data: assets }, { data: reports }, { data: projects }] = await Promise.all([
      selectAll((from, to) =>
        supabase.from("assets").select("resource_type, status, parent_asset_id, trust_score, trust_flags, review_status").order("id").range(from, to),
      ).then((data) => ({ data })),
      supabase.from("reports").select("id, kind, created_at").order("created_at", { ascending: false }),
      supabase.from("projects").select("id").order("created_at", { ascending: false }).limit(1),
    ])
    const stats = computeStats(assets ?? [])
    const sealed = (reports ?? []).filter((r) => r.kind === "donor" || r.kind === "csr")
    return { stats, sealed: sealed.length, reportId: sealed[0]?.id as string | undefined, projectId: projects?.[0]?.id as string | undefined }
  } catch {
    return null
  }
}

export default async function Landing() {
  const live = await liveNumbers()
  const s = live?.stats
  const projectHref = live?.projectId ? `/projects/${live.projectId}` : "/dashboard"
  const reportHref = live?.reportId ? `/verify/${live.reportId}` : "/dashboard"
  const line = s && s.total > 0
    ? `${s.total} files. ${s.verified} verified, ${s.awaitingReview} flagged for review, ${live.sealed} sealed report${live.sealed === 1 ? "" : "s"}. Click any number and see the photos behind it.`
    : "An empty workspace, ready for your first upload."

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="mx-auto flex h-[60px] max-w-[1280px] items-center gap-7 px-4 md:px-6 xl:px-8">
          <Wordmark href="/" />
          <nav aria-label="Landing" className="hidden gap-[22px] md:flex">
            <a href="#how" className="text-sm text-fg-2 hover:text-fg">How it works</a>
            <a href="#brief" className="text-sm text-fg-2 hover:text-fg">The brief</a>
            <Link href={reportHref} className="text-sm text-fg-2 hover:text-fg">Verify a report</Link>
          </nav>
          <span className="flex-1" />
          <ThemeToggle />
          <Link href="/dashboard" className={buttonVariants()}>Open the ledger →</Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-8">
          <section aria-labelledby="hero-h" className="grid items-center gap-6 py-10 lg:grid-cols-12 lg:py-16">
            <div className="grid gap-[26px] lg:col-span-6">
              <Eyebrow mark>Evidence platform for field projects</Eyebrow>
              <h1 id="hero-h" className="font-heading text-[clamp(42px,6.4vw,88px)] font-light leading-[0.96] tracking-[-0.04em] text-balance [&_b]:font-[650]">
                Every field photo is a <b>claim.</b><br />Overlook <b className="text-accent-ink">checks</b> it.
              </h1>
              <p className="max-w-[50ch] text-lg leading-7 text-fg-2">NGOs, CSR teams and government field projects upload photos and video. Overlook reads where and when each one was taken, sees what is in it, scores how far to trust it, and seals the report so anyone can verify it by scanning a QR code.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>Open the ledger →</Link>
                <a href="#how" className={buttonVariants({ size: "lg", variant: "outline" })}>Watch a photo get checked ↓</a>
              </div>
            </div>
            <div className="lg:col-span-6"><HeroContactSheet /></div>
          </section>

          <dl className="mb-6 grid grid-cols-2 border-y border-line md:grid-cols-4" aria-label="What the system does">
            {PROOF.map(([n, t], i) => (
              <div key={n} className={`grid content-start gap-1 border-line py-[18px] pr-[18px] max-md:nth-[n+3]:border-t md:border-l md:pl-[18px] md:first:border-l-0 md:first:pl-0 ${i % 2 ? "max-md:border-l max-md:pl-[18px]" : ""}`}>
                <dt className="font-mono text-[30px] font-light leading-8 tracking-[-0.03em] [font-stretch:81%]">{n}</dt>
                <dd className="text-small m-0">{t}</dd>
              </div>
            ))}
          </dl>
        </div>

        <StoryScroller />

        <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-8">
          <section id="brief" aria-labelledby="brief-h" className="grid scroll-mt-20 gap-7 pb-[72px] pt-24">
            <div className="grid gap-2.5"><Eyebrow mark>Problem statement 02 · Cloudinary</Eyebrow><h2 id="brief-h" className="text-h1">Everything the brief asks for, <b className="font-semibold">working</b>.</h2></div>
            <BriefLedger project={projectHref} report={reportHref} />
          </section>
        </div>

        <section aria-labelledby="cta-h" className="bg-cy py-[88px] text-cy-fg">
          <div className="mx-auto grid max-w-[1280px] gap-6 px-4 md:px-6 xl:px-8">
            <Eyebrow mark className="[--mark-bg:#D2DCFB] [--mark-fg:var(--cy)]">Sample workspace · no sign-in</Eyebrow>
            <h2 id="cta-h" className="font-heading text-[clamp(40px,6vw,76px)] font-light leading-none tracking-[-0.04em] [&_b]:font-[650]">Open the <b>ledger.</b></h2>
            <p className="max-w-[52ch] text-[17px] leading-[27px] text-cy-fg2">{line}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard" className={buttonVariants({ variant: "paper", size: "lg" })}>Open the ledger →</Link>
              <Link href={reportHref} className={buttonVariants({ variant: "onblue", size: "lg" })}>Verify a sealed report</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-7">
        <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-4 px-4 md:px-6 xl:px-8">
          <span className="text-data flex items-center gap-2 text-fg-3"><SealMark size={12} />Overlook · Code Cubicle 6.0 · Problem statement 02</span>
          <span className="text-data text-fg-3">Cloudinary · Supabase · Gemini</span>
        </div>
      </footer>
    </>
  )
}
