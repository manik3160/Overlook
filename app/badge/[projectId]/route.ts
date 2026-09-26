import { loadEvidence } from "@/lib/project-data"
import { isVerified } from "@/lib/signals"
import { badgeSvg } from "@/lib/money"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// "Verified by Overlook" badge for an NGO's website (links to /live/<id>). Cached 10 minutes by browsers and CDNs.
export async function GET(_request: Request, ctx: RouteContext<"/badge/[projectId]">) {
  const { projectId } = await ctx.params
  if (!UUID.test(projectId)) return new Response("Not found", { status: 404 })
  const { rows } = await loadEvidence(projectId) // rejected photos are already excluded
  const images = rows.filter((r) => r.resource_type === "image")
  return new Response(badgeSvg({ verified: images.filter(isVerified).length, total: images.length }), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=600" },
  })
}
