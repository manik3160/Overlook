"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Sticky in-page anchors with scroll-spy (DESIGN.md 7.18). Sits under the top bar on the project page.
export default function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id)
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (vis) setActive(vis.target.id)
    }, { rootMargin: "-120px 0px -60% 0px" })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items])
  return (
    <nav aria-label="Sections" className="sticky top-14 z-20 -mx-4 mb-12 overflow-x-auto border-b border-line bg-bg px-4 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
      <ul className="flex list-none gap-1 p-0">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? "true" : undefined} className={cn("block whitespace-nowrap px-3 py-3 text-sm font-medium text-fg-2 shadow-[inset_0_-2px_0_transparent] transition-colors hover:text-fg max-md:py-3.5", active === i.id && "text-fg shadow-[inset_0_-2px_0_var(--fg)]")}>{i.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
