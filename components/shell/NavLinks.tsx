"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/dashboard", label: "Overview", match: ["/dashboard", "/projects", "/assets"] },
  { href: "/upload", label: "Upload", match: ["/upload"] },
  { href: "/search", label: "Search", match: ["/search"] },
  { href: "/review", label: "Review", match: ["/review"] },
  { href: "/registry", label: "Registry", match: ["/registry"] },
]

export default function NavLinks({ reviewCount, vertical = false }: { reviewCount: number; vertical?: boolean }) {
  const path = usePathname()
  return (
    <nav aria-label="Main" className={cn("flex", vertical ? "flex-col" : "h-full gap-1")}>
      {ITEMS.map((it) => {
        const active = it.match.some((m) => path === m || path.startsWith(m + "/"))
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 px-3 text-sm font-medium text-fg-2 transition-colors duration-[120ms] hover:text-fg",
              vertical ? "h-12 border-b border-line" : "h-full shadow-[inset_0_-2px_0_transparent]",
              active && (vertical ? "text-fg" : "text-fg shadow-[inset_0_-2px_0_var(--fg)]")
            )}
          >
            {it.label}
            {it.href === "/review" && reviewCount > 0 && (
              <span className="rounded-[4px] bg-review-tint px-[5px] py-1 font-mono text-[10px] font-semibold leading-none text-review" aria-label={`${reviewCount} awaiting review`}>{reviewCount}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
