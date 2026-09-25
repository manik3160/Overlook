"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

export default function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      /* clipboard can be refused; the value is still visible next to the button */
    }
  }
  return (
    <>
      <button type="button" onClick={copy} aria-label={label} className="ml-2 inline-grid size-5 place-items-center align-middle text-fg-3 hover:text-fg">
        {done ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
      </button>
      <span className="sr-only" role="status">{done ? "Copied" : ""}</span>
    </>
  )
}
