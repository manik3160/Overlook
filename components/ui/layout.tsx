import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// `── 01 · SCORECARD` numbered eyebrow (DESIGN.md 4.2). The number is fixed per page.
export function Eyebrow({ children, rule = true, className }: { children: ReactNode; rule?: boolean; className?: string }) {
  return <p className={cn("text-eyebrow", rule && "eyebrow-rule", className)}>{children}</p>
}

// Page header pattern (DESIGN.md 6.2): breadcrumb, eyebrow, weight-contrast title, meta line, actions.
export function PageHeader({ eyebrow, title, meta, actions, back }: {
  eyebrow?: ReactNode; title: ReactNode; meta?: ReactNode; actions?: ReactNode; back?: { href: string; label: string }
}) {
  return (
    <header className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-7">
      <div className="grid min-w-0 gap-2.5">
        {back && <Link href={back.href} className="text-[13px] text-fg-2 hover:text-fg">← {back.label}</Link>}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-h1 break-words">{title}</h1>
        {meta && <p className="text-data text-fg-3">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Section({ id, eyebrow, title, action, children, className }: {
  id?: string; eyebrow: ReactNode; title: ReactNode; action?: ReactNode; children: ReactNode; className?: string
}) {
  const hid = id ? `${id}-h` : undefined
  return (
    <section id={id} aria-labelledby={hid} className={cn("mb-16 grid scroll-mt-32 gap-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="grid gap-2">
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
