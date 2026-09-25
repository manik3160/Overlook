// Perceptual hashes from Cloudinary are hex strings (64 bits = 16 hex chars).
// Near-duplicate threshold from CLAUDE.md §7.4: Hamming distance <= 6.
export const NEAR_DUPLICATE_MAX_DISTANCE = 6

const POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]

// Returns null when a hash is missing/invalid or the lengths differ (not comparable).
export function hammingDistance(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b || a.length !== b.length) return null
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return null
  let bits = 0
  for (let i = 0; i < a.length; i++) bits += POPCOUNT[parseInt(a[i], 16) ^ parseInt(b[i], 16)]
  return bits
}

export const isNearDuplicate = (a: string | null | undefined, b: string | null | undefined) => {
  const d = hammingDistance(a, b)
  return d !== null && d <= NEAR_DUPLICATE_MAX_DISTANCE
}
