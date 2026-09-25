"use client"

// Shown when a page fails to load. The most common cause on a fresh checkout is missing configuration.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="space-y-3 p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm" role="alert">{error.message || "The page could not be loaded."}</p>
      <ul className="list-disc pl-5 text-sm">
        <li>Check that <code>.env.local</code> has every value from <code>.env.example</code> (Supabase URL and service key, Cloudinary keys).</li>
        <li>Check that the Supabase migration in <code>supabase/migrations/0001_init.sql</code> has been run.</li>
        <li>If it is an AI error, the free-tier daily quota may be used up; try again later.</li>
      </ul>
      {error.digest && <p className="text-xs">Reference: {error.digest}</p>}
      <button onClick={reset} className="border px-3 py-1 text-sm">Try again</button>
    </main>
  )
}
