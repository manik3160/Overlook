import { Info, type LucideProps } from "lucide-react"
import { FLAG_COPY } from "@/components/flag-copy"

// Icon for a flag code (DESIGN.md 4.8 mapping). A component, so callers never create components during render.
export default function FlagIcon({ code, ...props }: { code: string } & LucideProps) {
  const Icon = FLAG_COPY[code]?.icon ?? Info
  return <Icon strokeWidth={1.5} size={16} {...props} />
}
