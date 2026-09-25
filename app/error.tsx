"use client"

import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/layout"
import { InlineNotice } from "@/components/ui/notice"

// Shown when a page fails to load. The most common cause on a fresh checkout is missing configuration.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto grid w-full max-w-[880px] flex-1 content-start gap-5 px-4 py-16 md:px-6">
      <Eyebrow>Error</Eyebrow>
      <h1 className="text-h1">Something went <b className="font-semibold">wrong</b></h1>
      <InlineNotice tone="error">{error.message || "The page could not be loaded."}</InlineNotice>
      <ol className="text-small grid max-w-[68ch] list-decimal gap-1.5 pl-5">
        <li>Check that <code className="font-mono">.env.local</code> has every value from <code className="font-mono">.env.example</code> (Supabase URL and service key, Cloudinary keys).</li>
        <li>Check that the Supabase migration in <code className="font-mono">supabase/migrations/0001_init.sql</code> has been run.</li>
        <li>If it is an AI error, the free-tier daily quota may be used up; try again later.</li>
      </ol>
      {error.digest && <p className="text-hash text-fg-3">Reference: {error.digest}</p>}
      <div><Button onClick={reset}>Try again</Button></div>
    </main>
  )
}
