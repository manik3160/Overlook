import Link from "next/link"
import TrustBadge from "@/components/TrustBadge"
import ReviewButtons from "@/components/ReviewButtons"
import RecomputeButton from "@/components/RecomputeButton"
import { supabase } from "@/lib/supabase"
import { thumbUrl } from "@/lib/cloudinary-url"
import type { TrustFlag } from "@/lib/trust"

export const dynamic = "force-dynamic"

type Row = { id: string; public_id: string; secure_url: string; resource_type: string; trust_score: number | null; trust_flags: TrustFlag[] | null; review_status: string }

function Item({ a }: { a: Row }) {
  return (
    <li className="flex gap-4 border p-2 text-sm">
      <Link href={`/assets/${a.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbUrl(a.secure_url, a.resource_type)} alt="" width={120} height={120} />
      </Link>
      <div className="space-y-1">
        <div><Link href={`/assets/${a.id}`} className="underline">{a.public_id}</Link> <TrustBadge score={a.trust_score} reviewStatus={a.review_status} /></div>
        <ul>{(a.trust_flags ?? []).map((f, i) => <li key={i}>{f.code}: {f.reason}</li>)}</ul>
        <ReviewButtons assetId={a.id} current={a.review_status} />
      </div>
    </li>
  )
}

export default async function ReviewPage() {
  const { data } = await supabase
    .from("assets")
    .select("id, public_id, secure_url, resource_type, trust_score, trust_flags, review_status")
    .not("trust_score", "is", null)
    .order("trust_score", { ascending: true })
    .limit(500)
  const flagged = ((data ?? []) as Row[]).filter((a) => (a.trust_flags ?? []).length > 0)
  const waiting = flagged.filter((a) => a.review_status === "unreviewed")
  const reviewed = flagged.filter((a) => a.review_status !== "unreviewed")

  return (
    <main className="space-y-6 p-8">
      <header className="flex items-baseline gap-4">
        <Link href="/" className="underline">← Home</Link>
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <RecomputeButton />
      </header>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Flagged for review ({waiting.length})</h2>
        {waiting.length === 0 && <p className="text-sm">Nothing waiting.</p>}
        <ul className="space-y-2">{waiting.map((a) => <Item key={a.id} a={a} />)}</ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Reviewed ({reviewed.length})</h2>
        <ul className="space-y-2">{reviewed.map((a) => <Item key={a.id} a={a} />)}</ul>
      </section>
    </main>
  )
}
