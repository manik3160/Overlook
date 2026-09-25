import type { Metadata } from "next"
import ReviewQueue, { type ReviewRow } from "@/components/ReviewQueue"
import RecomputeButton from "@/components/RecomputeButton"
import { Kbd, PageHeader } from "@/components/ui/layout"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Review queue" }

export default async function ReviewPage() {
  const { data } = await supabase
    .from("assets")
    .select("id, public_id, secure_url, resource_type, status, trust_score, trust_flags, review_status")
    .not("trust_score", "is", null)
    .order("trust_score", { ascending: true })
    .limit(500)
  const flagged = ((data ?? []) as ReviewRow[]).filter((a) => (a.trust_flags ?? []).length > 0)
  const waiting = flagged.filter((a) => a.review_status === "unreviewed")
  const reviewed = flagged.filter((a) => a.review_status !== "unreviewed")

  return (
    <>
      <PageHeader
        eyebrow="Quality control"
        title={<><b className="font-semibold">Review</b> queue</>}
        lede={waiting.length === 0 ? "Nothing is waiting for a decision." : `${waiting.length} photo${waiting.length === 1 ? " is" : "s are"} waiting for a human decision. Lowest scores come first.`}
        meta={`${waiting.length} flagged for review · ${reviewed.length} reviewed`}
        actions={<RecomputeButton />}
      />
      <p className="text-data mb-10 hidden items-center gap-2 text-fg-3 md:flex" aria-label="Keyboard shortcuts">
        <Kbd>J</Kbd><Kbd>K</Kbd> move · <Kbd>A</Kbd> approve · <Kbd>R</Kbd> reject · <Kbd>U</Kbd> undo · <Kbd>↵</Kbd> open
      </p>
      <ReviewQueue initialWaiting={waiting} initialReviewed={reviewed} />
    </>
  )
}
