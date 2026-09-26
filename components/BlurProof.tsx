"use client"

import { useState } from "react"
import CloudinaryMark from "@/components/CloudinaryMark"
import { Eyebrow } from "@/components/ui/layout"
import { buttonVariants } from "@/components/ui/button"

// "Try to remove the blur": swaps the public photo for the stored file with NO transformation in its address.
// Faces stay hidden, because Cloudinary blurred them inside the stored copy; public pages never point at the original.
export default function BlurProof({ viewUrl, rawUrl }: { viewUrl: string; rawUrl: string }) {
  const [raw, setRaw] = useState(false)
  return (
    <section className="grid gap-4" aria-labelledby="s-blur">
      <div className="flex flex-wrap items-center gap-3">
        <Eyebrow>Privacy</Eyebrow>
        <CloudinaryMark says="Faces are blurred inside the stored public copy, not just in the web address" />
      </div>
      <h2 id="s-blur" className="text-h2">Faces stay hidden</h2>
      <p className="max-w-[62ch] text-[15px] leading-6 text-fg-2">
        Anyone can edit a web address. So this page never shows the original photo: it shows a copy that Cloudinary stored with faces already blurred.
        Try it yourself.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={raw ? rawUrl : viewUrl} alt={raw ? "The stored public copy, with no changes applied" : "Public copy of the after photo"} className="w-full max-w-[420px] border border-line bg-surface-2" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRaw((v) => !v)} className={buttonVariants({ variant: "outline", size: "sm" })} aria-pressed={raw}>
          {raw ? "Show the page version again" : "Try to remove the blur"}
        </button>
        {raw && <a href={rawUrl} target="_blank" rel="noreferrer" className="text-[13px] text-accent-ink underline">Open this file on its own ↗</a>}
      </div>
      <p aria-live="polite" className="max-w-[62ch] text-[15px] leading-6">
        {raw
          ? <><b className="font-semibold">Nothing changed.</b> This is the stored file itself, with nothing applied: no resizing, no effects. Every face Cloudinary found was blurred when this copy was stored, so no web address can undo it.</>
          : "Right now you see the page version (resized for this page)."}
      </p>
      {raw && <code className="block max-w-full break-all rounded-sm bg-surface-2 p-2 font-mono text-[11.5px] leading-4 text-fg-2">{rawUrl}</code>}
    </section>
  )
}
