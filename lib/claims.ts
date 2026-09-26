// Claim Checker. PURE: given one claim from an NGO report and the photos that match it, decide how well the
// verified evidence supports it. Wording rule: "no evidence found", never "false": missing photos are not proof
// that something did not happen, and numbers ("500 saplings") cannot be counted from photos.
import { z } from "zod"

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const claimSchema = z.object({
  text: z.string().trim().min(3).max(300), // the claim as written
  type: z.enum(["activity", "change", "quantity", "date"]),
  subject: z.string().trim().min(2).max(120), // what a photo of it would show, used for search
  number: z.number().nullable(),
  unit: z.string().max(40).nullable(),
  dateFrom: day.nullable(),
  dateTo: day.nullable(),
})
export const extractedClaimsSchema = z.object({ claims: z.array(claimSchema).max(8) })
export type Claim = z.infer<typeof claimSchema>

export type ClaimMatch = { id: string; verified: boolean; time: number | null; inPair: boolean }
export type Verdict = "supported" | "partly" | "no_evidence"
export type ClaimResult = { claim: Claim; verdict: Verdict; reason: string; photoIds: string[] }

export const VERDICT_LABEL: Record<Verdict, string> = { supported: "Supported", partly: "Partly supported", no_evidence: "No evidence found" }

const inWindow = (t: number | null, from: string | null, to: string | null) =>
  (!from && !to) || (t !== null && (!from || t >= Date.parse(`${from}T00:00:00Z`)) && (!to || t <= Date.parse(`${to}T23:59:59Z`)))
const shows = (k: number) => `${k} verified photo${k === 1 ? " shows" : "s show"} this`

export function judgeClaim(claim: Claim, matches: ClaimMatch[]): ClaimResult {
  const dated = !!(claim.dateFrom || claim.dateTo)
  const verified = matches.filter((m) => m.verified)
  const inTime = verified.filter((m) => inWindow(m.time, claim.dateFrom, claim.dateTo))
  const ids = (ms: ClaimMatch[]) => ms.map((m) => m.id)
  const result = (verdict: Verdict, reason: string, ms: ClaimMatch[]): ClaimResult => ({ claim, verdict, reason, photoIds: ids(ms) })

  if (verified.length === 0) {
    return matches.length
      ? result("partly", `${matches.length} matching photo${matches.length === 1 ? " is" : "s are"} still flagged for review, so ${matches.length === 1 ? "it does" : "they do"} not count yet.`, [])
      : result("no_evidence", "No photo in this project shows this.", [])
  }
  if (dated && inTime.length === 0) return result("partly", `${shows(verified.length)}, but none ${verified.length === 1 ? "is" : "are"} dated ${claim.dateFrom ?? "…"} to ${claim.dateTo ?? "…"}.`, verified)

  const use = dated ? inTime : verified
  switch (claim.type) {
    case "change": {
      const paired = use.filter((m) => m.inPair)
      return paired.length
        ? result("supported", `${shows(use.length)}, including a before/after pair of the same spot.`, use)
        : result("partly", `${shows(use.length)}, but no before/after pair of the same spot shows the change.`, use)
    }
    case "quantity":
      return result("partly", `${shows(use.length)}. The number${claim.number !== null ? ` (${claim.number}${claim.unit ? ` ${claim.unit}` : ""})` : ""} cannot be confirmed from photos.`, use)
    default:
      return use.length >= 2
        ? result("supported", `${shows(use.length)}${dated ? " in that period" : ""}.`, use)
        : result("partly", `Only 1 verified photo shows this${dated ? " in that period" : ""}.`, use)
  }
}

export const summarize = (rs: ClaimResult[]) => ({
  supported: rs.filter((r) => r.verdict === "supported").length,
  partly: rs.filter((r) => r.verdict === "partly").length,
  noEvidence: rs.filter((r) => r.verdict === "no_evidence").length,
})
