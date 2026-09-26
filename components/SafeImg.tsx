"use client"

import { useState } from "react"
import { ImageOff } from "lucide-react"

// Falls back to a labelled block that keeps its box, so a broken Cloudinary URL never collapses the grid.
export default function SafeImg({ src, alt, className, veil = false }: { src: string; alt: string; className?: string; veil?: boolean }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return veil ? null : (
      <span className="absolute inset-0 grid place-content-center justify-items-center gap-1 bg-surface-2 text-fg-3">
        <ImageOff size={20} strokeWidth={1.5} aria-hidden="true" />
        <span className="text-micro">Image unavailable</span>
      </span>
    )
  }
  // `data-loaded` drives the fade-in in CSS. The ref catches images that finished loading before hydration.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transformation URLs are already sized
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      ref={(el) => { if (el?.complete && el.naturalWidth) el.dataset.loaded = "1" }}
      onLoad={(e) => { e.currentTarget.dataset.loaded = "1" }}
      onError={() => setBroken(true)}
      className={className}
      aria-hidden={veil || undefined}
    />
  )
}
