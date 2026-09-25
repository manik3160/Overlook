import Link from "next/link"

// A "sealed frame": a square with a filled inner square (DESIGN.md 6.1).
export function SealMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5.5" y="5.5" width="5" height="5" fill="currentColor" />
    </svg>
  )
}

export default function Wordmark({ href = "/dashboard", label = true }: { href?: string; label?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-heading text-base font-[650] leading-none tracking-[-0.01em]">
      <SealMark />
      <span className={label ? "" : "max-md:sr-only"}>Overlook</span>
    </Link>
  )
}
