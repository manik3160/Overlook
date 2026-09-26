// Growth and money hooks. PURE.
// 1. "Verified by Overlook" badge: a small SVG an NGO embeds on its website, linking to its live donor page.
// 2. Cost per verified outcome: what a funder's money bought, counted only from verified evidence.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const CHAR_W = 6.6 // px per character at 11px Verdana, as in the common badge style

export function badgeSvg(o: { verified: number; total: number }): string {
  const pct = o.total ? Math.round((o.verified / o.total) * 100) : 0
  const left = "verified by Overlook"
  const right = o.total ? `${pct}% · ${o.verified} of ${o.total} photos` : "no photos yet"
  const lw = Math.round(left.length * CHAR_W + 20), rw = Math.round(right.length * CHAR_W + 20), w = lw + rw
  const color = !o.total ? "#6D6B64" : pct >= 80 ? "#237A4B" : pct >= 50 ? "#8A5600" : "#B3261E"
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(`${left}: ${right}`)}">
<title>${esc(`${left}: ${right}`)}</title>
<rect width="${lw}" height="20" fill="#141412"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/>
<g fill="#FBFAF8" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${lw / 2}" y="14">${esc(left)}</text><text x="${lw + rw / 2}" y="14">${esc(right)}</text>
</g></svg>`
}

export type CostInput = { grantInr: number; verifiedPhotos: number; verifiedSpots: number; releasablePct: number | null }
export type CostOutput = { perPhoto: number | null; perSpot: number | null; releasableInr: number | null }

export function costPerOutcome(c: CostInput): CostOutput {
  return {
    perPhoto: c.verifiedPhotos ? Math.round(c.grantInr / c.verifiedPhotos) : null,
    perSpot: c.verifiedSpots ? Math.round(c.grantInr / c.verifiedSpots) : null,
    releasableInr: c.releasablePct === null ? null : Math.round((c.grantInr * c.releasablePct) / 100),
  }
}

// ₹12,34,567 (Indian digit grouping)
export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`
