// Human titles per trust flag code (DESIGN.md 7.6). Plain data so server code (e.g. the Cloudinary sync) can use it too;
// icons live in components/flag-copy.ts. `reason` text always comes from lib/trust.ts unchanged.
export const FLAG_TITLES: Record<string, string> = {
  DUPLICATE_EXACT: "Same file uploaded before",
  DUPLICATE_REUSED: "Near-identical to an earlier photo",
  PHOTO_OF_PHOTO: "Looks like a photo of a screen or print",
  OUTSIDE_GEOFENCE: "Taken outside the site",
  OUTSIDE_TIMEFRAME: "Taken outside the project dates",
  IRRELEVANT: "Doesn't look like field work",
  AI_GENERATED_DECLARED: "Declares it was made with generative AI",
  IMPOSSIBLE_TRAVEL: "Same device, two places too far apart",
  CAPTURED_LIVE: "Captured live and signed on the device",
  NO_METADATA: "No location or time metadata",
  LOW_CONFIDENCE: "Couldn't classify confidently",
}
