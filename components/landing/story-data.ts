import { rng } from "@/components/landing/scenes"

// A fixed ILLUSTRATIVE case for the landing story. It is not live workspace data and is labelled as such on screen.
export const CASE = {
  takenAt: "3 Sep 2026, 10:12 IST",
  gps: "28.52511, 77.31622",
  caption: "Plastic bags and cloth waste scattered across a muddy riverbank; no people visible.",
  distanceM: 1812,
  geofenceM: 500,
  hamming: 3,
}

// 64-bit perceptual hashes; the earlier upload differs by exactly 3 bits.
const r = rng(1187)
export const BITS_A = Array.from({ length: 64 }, () => (r() > 0.5 ? 1 : 0))
export const DIFF = [9, 34, 51]
export const BITS_B = BITS_A.map((b, i) => (DIFF.includes(i) ? 1 - b : b))

export const BA_ROWS: [label: string, bh: number, bt: number, ah: number, at: number][] = [
  ["Garbage visible", 18, 20, 2, 22],
  ["Dense vegetation", 3, 20, 12, 22],
  ["People working", 4, 20, 15, 22],
]

export const REPORT_HASH = "3f9a1c027be41d9a0c55e81f2a6b7d3e94c0f1a8b2e7d6c5f3a19e0b4c8d7e2f"

export const HERO_FRAMES: { kind: "before" | "after" | "people" | "water" | "screen"; seed: number; date: string; flag?: string }[] = [
  { kind: "before", seed: 3, date: "4 AUG" }, { kind: "people", seed: 4, date: "4 AUG" }, { kind: "screen", seed: 5, date: "2 SEP", flag: "Photo of a screen" }, { kind: "water", seed: 6, date: "6 AUG" },
  { kind: "after", seed: 7, date: "11 SEP" }, { kind: "people", seed: 8, date: "19 AUG" }, { kind: "before", seed: 9, date: "12 AUG" }, { kind: "before", seed: 41, date: "3 SEP", flag: "Reused image" },
  { kind: "after", seed: 10, date: "11 SEP" }, { kind: "water", seed: 11, date: "9 SEP", flag: "1.8 km off-site" }, { kind: "after", seed: 12, date: "14 SEP" }, { kind: "people", seed: 13, date: "24 AUG" },
]
