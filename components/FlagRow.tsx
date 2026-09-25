import { TRUST_DEDUCTIONS, type TrustFlag } from "@/lib/trust"
import FlagIcon from "@/components/FlagIcon"
import { flagTitle } from "@/components/flag-copy"

const TONE = { high: "text-suspicious", warning: "text-review", info: "text-fg-2" } as const
export const deductionFor = (code: string): number | null => (TRUST_DEDUCTIONS as Record<string, number>)[code] ?? null

// Compact flag line: icon, human title, reason, deduction (DESIGN.md 7.6). Used on review cards.
export default function FlagRow({ flag }: { flag: Pick<TrustFlag, "code" | "severity" | "reason"> }) {
  const d = deductionFor(flag.code)
  return (
    <div className="grid grid-cols-[18px_1fr_auto] items-start gap-2.5 border-t border-line pt-2.5">
      <FlagIcon code={flag.code} className={`mt-[3px] ${TONE[flag.severity]}`} aria-hidden="true" />
      <div className="grid min-w-0 gap-0.5">
        <span className="text-[15px] font-medium leading-[22px]">{flagTitle(flag.code)}</span>
        <span className="text-small">{flag.reason}</span>
      </div>
      <span className={`font-mono text-[13px] tabular-nums ${TONE[flag.severity]}`}>{d === null ? "cap 60" : `−${d}`}</span>
    </div>
  )
}
