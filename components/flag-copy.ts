import { CalendarX, CircleSlash, Copy, Info, LocateOff, MonitorSmartphone, ShieldCheck, type LucideIcon } from "lucide-react"

// Human titles and icons per flag code (DESIGN.md 7.6). `reason` text always comes from lib/trust.ts unchanged.
export const FLAG_COPY: Record<string, { title: string; icon: LucideIcon }> = {
  DUPLICATE_EXACT: { title: "Same file uploaded before", icon: Copy },
  DUPLICATE_REUSED: { title: "Near-identical to an earlier photo", icon: Copy },
  PHOTO_OF_PHOTO: { title: "Looks like a photo of a screen or print", icon: MonitorSmartphone },
  OUTSIDE_GEOFENCE: { title: "Taken outside the site", icon: LocateOff },
  OUTSIDE_TIMEFRAME: { title: "Taken outside the project dates", icon: CalendarX },
  IRRELEVANT: { title: "Doesn't look like field work", icon: CircleSlash },
  CAPTURED_LIVE: { title: "Captured live and signed on the device", icon: ShieldCheck },
  NO_METADATA: { title: "No location or time metadata", icon: Info },
  LOW_CONFIDENCE: { title: "Couldn't classify confidently", icon: Info },
}

export const flagTitle = (code: string) => FLAG_COPY[code]?.title ?? code
