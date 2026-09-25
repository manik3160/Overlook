import { flagTitle } from "@/components/flag-copy"

export type StateInput = {
  status: string
  trust_score: number | null
  trust_flags: { code: string; severity: string }[] | null
  review_status: string
}
export type TileState = { developed: boolean; flagged: boolean; label?: string; chip?: "PENDING" | "ANALYZING" | "FAILED" }

// DESIGN.md 4.9: an unverified photo is a cyanotype that develops into colour once it passes its checks.
// Blue means "not proven yet"; red crop marks + a label mean "flagged for review".
export function tileState(a: StateInput): TileState {
  const chip = a.status === "failed" ? "FAILED" : a.status === "analyzing" ? "ANALYZING" : a.status !== "done" ? "PENDING" : undefined
  if (a.review_status === "rejected") return { developed: false, flagged: true, label: "Rejected", chip }
  if (a.review_status === "approved") return { developed: !chip, flagged: false, chip }
  const flags = a.trust_flags ?? []
  const high = flags.find((f) => f.severity === "high")
  const flagged = (a.trust_score !== null && a.trust_score < 50) || !!high
  const label = flagged ? flagTitle((high ?? flags[0])?.code ?? "") || "Flagged for review" : undefined
  return { developed: !chip && !flagged && a.trust_score !== null, flagged, label, chip }
}
