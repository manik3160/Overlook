import type { Metadata } from "next"
import RegistryChecker from "@/components/RegistryChecker"

export const metadata: Metadata = { title: "Has this photo been used before?" }

// PUBLIC: anyone (a funder, a journalist, a judge) can check a photo against every project's evidence.
export default function RegistryPage() {
  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <p className="text-eyebrow">Evidence registry</p>
        <h1 className="text-h1 !font-semibold">Has this photo been used before?</h1>
        <p className="max-w-[62ch] text-lg text-fg-2">Drop a photo from any report. We compare its fingerprints with every photo submitted to Overlook, across all organisations, and tell you where and when it was first used. Resized, recompressed and forwarded copies are found too.</p>
      </header>
      <RegistryChecker />
      <section className="grid gap-2 border-t border-line pt-6 text-small">
        <p><b className="text-fg">Privacy:</b> your photo is deleted right after the check. Only its fingerprints (an MD5 hash and a perceptual hash) are compared.</p>
        <p><b className="text-fg">For funders and auditors:</b> check without sending the photo at all: <span className="text-data break-all">GET /api/registry/lookup?md5=&lt;file MD5&gt;</span></p>
      </section>
    </div>
  )
}
