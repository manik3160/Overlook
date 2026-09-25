import Link from "next/link"

export default function NotFound() {
  return (
    <main className="space-y-2 p-8">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-sm">That page, project, photo or report does not exist (or was removed).</p>
      <Link href="/" className="underline">Back to the dashboard</Link>
    </main>
  )
}
