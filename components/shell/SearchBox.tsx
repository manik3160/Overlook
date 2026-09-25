"use client"

import { useEffect, useRef } from "react"
import { Search } from "lucide-react"
import { Kbd } from "@/components/ui/layout"

// A real GET form (works without JS). "/" focuses it unless you are already typing.
export default function SearchBox({ className }: { className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === "/" && !t.closest("input,textarea,select,[contenteditable]") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
  }, [])
  return (
    <form action="/search" method="get" role="search" className={className}>
      <label className="flex h-8 w-full items-center gap-2 rounded-sm border border-line-strong bg-surface-2 px-2.5 text-[13px] text-fg-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-ink">
        <Search size={15} strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">Search evidence</span>
        <input ref={ref} name="q" type="search" placeholder="Search evidence…" className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-3" />
        <Kbd>/</Kbd>
      </label>
    </form>
  )
}
