"use client"

import { useEffect, useRef, useState } from "react"

export type Chapter = { second: number; title: string }

// Cloudinary Video Player (the same pinned build next-cloudinary uses). Loaded directly: next-cloudinary's
// <CldVideoPlayer> relies on a next/script that did not run reliably in this app (preloaded, never executed).
const VERSION = "1.11.1"
const JS = `https://unpkg.com/cloudinary-video-player@${VERSION}/dist/cld-video-player.min.js`
const CSS = `https://unpkg.com/cloudinary-video-player@${VERSION}/dist/cld-video-player.min.css`

type Player = { source: (id: string, o?: object) => void; on: (e: string, f: () => void) => void; currentTime: (s: number) => void; dispose: () => void }
type CloudinaryGlobal = { videoPlayer: (el: HTMLVideoElement, o: object) => Player }

let loading: Promise<CloudinaryGlobal> | null = null
function loadPlayer(): Promise<CloudinaryGlobal> {
  const w = window as unknown as { cloudinary?: CloudinaryGlobal }
  if (w.cloudinary?.videoPlayer) return Promise.resolve(w.cloudinary)
  loading ??= new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS}"]`)) document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: CSS }))
    const s = Object.assign(document.createElement("script"), { src: JS, async: true })
    s.onload = () => (w.cloudinary?.videoPlayer ? resolve(w.cloudinary) : reject(new Error("player missing")))
    s.onerror = () => { loading = null; reject(new Error("could not load the Cloudinary Video Player")) }
    document.head.append(s)
  })
  return loading
}

// Chapters at every key frame the pipeline extracted (so a reviewer can jump straight to the moment behind each
// frame's trust score), thumbnails on the seek bar, Cloudinary's automatic format/quality delivery.
// Falls back to a plain <video> if the player cannot load.
export default function CloudVideo({ cloudName, publicId, fallbackSrc, poster, chapters, startAt }: {
  cloudName: string; publicId: string; fallbackSrc: string; poster?: string; chapters: Chapter[]; startAt?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const chapterKey = JSON.stringify(chapters)

  useEffect(() => {
    let player: Player | null = null
    let cancelled = false
    loadPlayer().then((cld) => {
      if (cancelled || !box.current) return
      // the player wraps (and on dispose removes) its <video>, so each mount makes a fresh one
      const el = Object.assign(document.createElement("video"), { className: "cld-video-player cld-fluid", playsInline: true })
      if (poster) el.poster = poster
      box.current.replaceChildren(el)
      const map = Object.fromEntries((JSON.parse(chapterKey) as Chapter[]).map((c) => [c.second, c.title]))
      const hasChapters = Object.keys(map).length > 0
      player = cld.videoPlayer(el, { cloud_name: cloudName, controls: true, fluid: true, seekThumbnails: true, ...(hasChapters ? { chaptersButton: true } : {}) })
      player.source(publicId, hasChapters ? { chapters: map } : {})
      if (startAt) player.on("loadedmetadata", () => player?.currentTime(startAt))
    }).catch(() => !cancelled && setFailed(true))
    return () => { cancelled = true; try { player?.dispose() } catch { /* already gone */ } }
  }, [cloudName, publicId, chapterKey, startAt, poster])

  if (failed) return <video controls src={startAt ? `${fallbackSrc}#t=${startAt}` : fallbackSrc} poster={poster} className="max-h-[72vh] w-full bg-surface-2" />
  return (
    <div ref={box} className="min-h-[200px] w-full bg-surface-2" />
  )
}
