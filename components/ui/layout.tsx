import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Small mono caps label. Plain grey by default. `mark` puts it on the blue highlighter (DESIGN.md 4.2): use it once
// per page (the page label) and on the landing page. A leading "NN · " is dropped unless `numbered`, which is only for
// steps that really are a sequence (the upload flow, the landing story).
export function Eyebrow({ children, mark = false, numbered = false, className }: { children: ReactNode; mark?: boolean; numbered?: boolean; className?: string }) {
  const m = typeof children === "string" ? children.match(/^(\d{2}) · ([\s\S]+)$/) : null
  const body = m ? (numbered ? <><b className="mr-2 font-bold">{m[1]}</b>{m[2]}</> : m[2]) : children
  return <p className={cn("text-eyebrow", className)}>{mark ? <span className="eyebrow-mark">{body}</span> : body}</p>
}

// Page header, landing style (DESIGN.md 6.2): big light title with a bold key noun, a live one-line lede,
// optional aside (a sample sheet on empty states) and actions. `size="md"` for user-entered names.
export function PageHeader({ eyebrow, title, lede, meta, actions, aside, back, size = "hero" }: {
  eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; meta?: ReactNode; actions?: ReactNode; aside?: ReactNode
  back?: { href: string; label: string }; size?: "hero" | "md"
}) {
  const acts = actions && <div className="flex flex-wrap gap-2">{actions}</div>
  return (
    <header className="mb-14 grid gap-8 border-b border-line pb-8 lg:grid-cols-12 lg:items-center">
      <div className={cn("grid min-w-0 content-start gap-4", aside ? "lg:col-span-6" : "lg:col-span-9")}>
        {back && <Link href={back.href} className="text-[13px] text-fg-2 hover:text-fg">← {back.label}</Link>}
        {eyebrow && <Eyebrow mark>{eyebrow}</Eyebrow>}
        <h1 className={cn(size === "hero" ? "text-hero" : "text-hero-md", "break-words")}>{title}</h1>
        {lede && <p className="max-w-[50ch] text-lg leading-7 text-fg-2">{lede}</p>}
        {meta && <p className="text-data text-fg-3">{meta}</p>}
        {aside && acts && <div className="pt-2">{acts}</div>}
      </div>
      {aside ? <div className="lg:col-span-6">{aside}</div> : acts && <div className="lg:col-span-3 lg:flex lg:justify-end">{acts}</div>}
    </header>
  )
}

export function Section({ id, eyebrow, title, action, children, className }: {
  id?: string; eyebrow: ReactNode; title: ReactNode; action?: ReactNode; children: ReactNode; className?: string
}) {
  const hid = id ? `${id}-h` : undefined
  return (
    <section id={id} aria-labelledby={hid} className={cn("mb-16 grid scroll-mt-32 gap-5", className)}>
      <div className="reveal flex flex-wrap items-baseline justify-between gap-4">
        <div className="grid gap-2.5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 id={hid} className="text-h2">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Panel({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border border-line bg-surface-1", className)} {...rest}>{children}</div>
}

export function Chip({ children, href, className }: { children: ReactNode; href?: string; className?: string }) {
  const cls = cn("text-data inline-flex h-[22px] items-center rounded-sm border border-line-strong px-2 text-fg-2", href && "hover:border-fg-3 hover:text-fg", className)
  return href ? <Link href={href} className={cls}>{children}</Link> : <span className={cls}>{children}</span>
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-[3px] border border-line-strong px-1.5 py-[3px] font-mono text-[10px] leading-none text-fg-2">{children}</kbd>
}

// Definition list in two columns (DESIGN.md 7.18)
export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 border-t border-line sm:grid-cols-[150px_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-eyebrow border-b border-line pt-2.5 sm:py-2.5 sm:leading-[22px]">{k}</dt>
          <dd className="text-data min-w-0 break-words border-b border-line pb-2.5 sm:py-2.5 sm:leading-[22px]">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
