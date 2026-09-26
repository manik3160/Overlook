"use client"

import { useState } from "react"

// An <img> for Cloudinary generative transformations: the first request can answer 423 ("still generating") for a few
// seconds, so retry with a cache-busting query until it is ready, showing a plain waiting note meanwhile.
export default function RetryImage({ src, alt, width, height, className, waiting = "Cloudinary AI is working on this…" }: {
  src: string; alt: string; width: number; height: number; className?: string; waiting?: string
}) {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const failed = attempt > 20
  const url = attempt ? `${src}${src.includes("?") ? "&" : "?"}r=${attempt}` : src
  return (
    <span className="relative block" style={{ width, height }}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={alt}
          width={width}
          height={height}
          className={`${className ?? ""} ${loaded ? "" : "opacity-0"}`}
          // an image already in the browser cache can finish before React attaches onLoad
          ref={(el) => { if (el?.complete && el.naturalWidth > 0) setLoaded(true) }}
          onLoad={() => setLoaded(true)}
          onError={() => setTimeout(() => setAttempt((a) => a + 1), 3000)}
        />
      )}
      {!loaded && (
        <span className="absolute inset-0 grid place-items-center p-3 text-center text-[12.5px] leading-5 text-fg-2">
          {failed ? "Cloudinary could not make this image right now." : waiting}
        </span>
      )}
    </span>
  )
}
