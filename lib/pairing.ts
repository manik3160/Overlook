// Before/after pairing. PURE. Rules (CLAUDE.md §7.5): same project (caller passes one project's photos),
// within 50 m, at least 3 days apart, the earlier photo is the "before". For each after-photo pick the
// closest before-photo; GPS jitter is ~10 m, so photos within TIE_M of the closest are tied and the
// most similar image (embedding cosine) wins. Each before-photo is used at most once.
import { haversineM } from "./geo"

export type PairCandidate = { id: string; lat: number; lng: number; time: number; embedding: number[] | null }
export type Pair = { beforeId: string; afterId: string; distanceM: number; daysApart: number }
export type PairOptions = { maxDistM?: number; minDays?: number }

const DAY_MS = 86_400_000
const TIE_M = 10

export function cosine(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export function findPairs(befores: PairCandidate[], afters: PairCandidate[], opts: PairOptions = {}): Pair[] {
  const { maxDistM = 50, minDays = 3 } = opts
  const eligible = (b: PairCandidate, a: PairCandidate) => a.time - b.time >= minDays * DAY_MS && haversineM(a, b) <= maxDistM

  const closest = (a: PairCandidate) => Math.min(Infinity, ...befores.filter((b) => eligible(b, a)).map((b) => haversineM(a, b)))
  const used = new Set<string>()
  const pairs: Pair[] = []

  // Afters with the tightest match choose first, so a loose match never steals a better one's before-photo.
  for (const a of [...afters].sort((x, y) => closest(x) - closest(y))) {
    const options = befores.filter((b) => !used.has(b.id) && eligible(b, a)).map((b) => ({ b, d: haversineM(a, b) }))
    if (options.length === 0) continue
    const nearest = Math.min(...options.map((o) => o.d))
    const tied = options.filter((o) => o.d <= nearest + TIE_M)
    const best = tied.sort((x, y) => cosine(a.embedding, y.b.embedding) - cosine(a.embedding, x.b.embedding) || x.d - y.d)[0]
    used.add(best.b.id)
    pairs.push({ beforeId: best.b.id, afterId: a.id, distanceM: Math.round(best.d * 10) / 10, daysApart: Math.floor((a.time - best.b.time) / DAY_MS) })
  }
  return pairs
}
