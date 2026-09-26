"use client"

import { useLinkStatus } from "next/link"

// Rendered inside each project tab's <Link>: the moment a tab is clicked it gets the underline and a small pulse,
// so the click is acknowledged while the server builds the new view.
export default function TabPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] animate-pulse bg-fg" />
      <span className="sr-only">Loading</span>
    </>
  )
}
