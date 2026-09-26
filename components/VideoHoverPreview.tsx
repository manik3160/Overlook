"use client"

import { useState } from "react"

// On hover, plays Cloudinary's AI preview of the video (the most interesting seconds). Only requested on hover, so a
// grid of videos costs nothing until someone looks; if Cloudinary is still making it, the still frame just stays.
export default function VideoHoverPreview({ src }: { src: string }) {
  const [active, setActive] = useState(false)
  const [ready, setReady] = useState(false)
  return (
    <span className="absolute inset-0" onMouseEnter={() => setActive(true)} onMouseLeave={() => { setActive(false); setReady(false) }} title="Hover to play Cloudinary's AI preview of this video">
      {active && (
        <video src={src} autoPlay muted loop playsInline onCanPlay={() => setReady(true)} className={`absolute inset-0 size-full object-cover transition-opacity ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
      )}
    </span>
  )
}
