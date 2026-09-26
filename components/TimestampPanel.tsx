import { Bitcoin, Clock } from "lucide-react"
import AnchorButton from "@/components/AnchorButton"
import { Eyebrow } from "@/components/ui/layout"
import { loadTimestamp, upgradeTimestamp } from "@/lib/ots-server"
import { formatTime } from "@/lib/dates"

const link = "text-accent-ink underline decoration-accent-ink/40 underline-offset-[3px] hover:decoration-accent-ink"

// Public timestamp status for a sealed record. Checks the calendars for a Bitcoin confirmation on view (rate-limited).
export default async function TimestampPanel({ reportId }: { reportId: string }) {
  const row = await loadTimestamp(reportId)
  const ts = row ? (await upgradeTimestamp(row)).manifest : null
  return (
    <section className="mt-14 grid gap-3 border-t border-line pt-8" aria-labelledby="ts-h">
      <Eyebrow>Public timestamp</Eyebrow>
      <h2 id="ts-h" className="sr-only">Public timestamp</h2>
      {!ts ? (
        <>
          <p className="text-small max-w-[68ch]">This record has no public timestamp yet. Anchoring sends only its SHA-256 (not its content) to the free OpenTimestamps calendars, which put it into Bitcoin, so nobody, including Overlook, can later claim it was made at a different time.</p>
          <AnchorButton reportId={reportId} />
        </>
      ) : (
        <>
          <p className="flex items-start gap-2">
            {ts.bitcoin ? <Bitcoin size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-verified" aria-hidden="true" /> : <Clock size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-3" aria-hidden="true" />}
            <span>
              {ts.bitcoin
                ? <>Anchored in <b className="font-semibold">Bitcoin block {ts.bitcoin.height.toLocaleString("en-US")}</b>. This record existed no later than that block.</>
                : <>Submitted to {ts.calendars.length} OpenTimestamps calendar{ts.calendars.length === 1 ? "" : "s"} on {formatTime(ts.submitted_at)} IST. Waiting for a Bitcoin block (usually a few hours).</>}
            </span>
          </p>
          <p className="text-small">
            Check it yourself on <a href="https://opentimestamps.org" target="_blank" rel="noreferrer" className={link}>opentimestamps.org</a> with both files:{" "}
            <a href={`/api/reports/${reportId}/manifest`} className={link}>record (.json)</a> and <a href={`/api/reports/${reportId}/ots`} className={link}>proof (.ots)</a>.
            {ts.checked_at ? ` Last checked ${formatTime(ts.checked_at)} IST.` : ""}
          </p>
        </>
      )}
    </section>
  )
}
