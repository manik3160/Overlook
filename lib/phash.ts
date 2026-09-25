// Perceptual hashes from Cloudinary are hex strings (64 bits = 16 hex chars).
// Near-duplicate threshold from CLAUDE.md §7.4: Hamming distance <= 6.
export const NEAR_DUPLICATE_MAX_DISTANCE = 6

const POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]
// char code -> nibble value, -1 for non-hex. This runs for every pair of photos, so no regex/parseInt here.
const HEX = new Int8Array(128).fill(-1)
for (let i = 0; i < 16; i++) {
  HEX["0123456789abcdef".charCodeAt(i)] = i
  HEX["0123456789ABCDEF".charCodeAt(i)] = i
}

// Returns null when a hash is missing/invalid or the lengths differ (not comparable).
export function hammingDistance(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b || a.length !== b.length) return null
  let bits = 0
  for (let i = 0; i < a.length; i++) {
    const x = HEX[a.charCodeAt(i)] ?? -1
    const y = HEX[b.charCodeAt(i)] ?? -1
    if (x < 0 || y < 0) return null
    bits += POPCOUNT[x ^ y]
  }
  return bits
}

export const isNearDuplicate = (a: string | null | undefined, b: string | null | undefined) => {
  const d = hammingDistance(a, b)
  return d !== null && d <= NEAR_DUPLICATE_MAX_DISTANCE
}
