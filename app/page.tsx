import Link from "next/link"

export default function Home() {
  return (
    <main className="space-y-2 p-8">
      <h1 className="text-2xl font-semibold">Overlook</h1>
      <Link href="/upload" className="underline">Upload</Link>
    </main>
  )
}
