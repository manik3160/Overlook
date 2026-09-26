import { CalendarX, CircleSlash, Copy, Info, LocateOff, MonitorSmartphone, Route, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react"
import { FLAG_TITLES } from "@/lib/flag-titles"

// Human titles (lib/flag-titles.ts) and icons per flag code (DESIGN.md 7.6). `reason` text always comes from lib/trust.ts unchanged.
const ICONS: Record<string, LucideIcon> = {
  DUPLICATE_EXACT: Copy,
  DUPLICATE_REUSED: Copy,
  PHOTO_OF_PHOTO: MonitorSmartphone,
  OUTSIDE_GEOFENCE: LocateOff,
  OUTSIDE_TIMEFRAME: CalendarX,
  IRRELEVANT: CircleSlash,
  AI_GENERATED_DECLARED: Sparkles,
  IMPOSSIBLE_TRAVEL: Route,
  CAPTURED_LIVE: ShieldCheck,
  NO_METADATA: Info,
  LOW_CONFIDENCE: Info,
}

export const FLAG_COPY: Record<string, { title: string; icon: LucideIcon }> = Object.fromEntries(
  Object.entries(FLAG_TITLES).map(([code, title]) => [code, { title, icon: ICONS[code] ?? Info }]),
)

export const flagTitle = (code: string) => FLAG_COPY[code]?.title ?? code
