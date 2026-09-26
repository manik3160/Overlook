import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { supabase } from "@/lib/supabase"
import { manifestHash } from "@/lib/manifest"
import { reportSlideUrl } from "@/lib/manifest"
import { loadCampaign } from "@/lib/campaign-data"
import { ensurePublicCopy } from "@/lib/public-copy"
import { publicCopyUrl } from "@/lib/cloudinary-url"
import { writeStory } from "@/lib/gemini"
import { factsText, narrativeGrounded, templateNarrative, type Narrative, type StoryFacts } from "@/lib/story"

export const maxDuration = 60

// Builds the impact story from VERIFIED evidence only and stores it as a hashed 'social' report.
// One Gemini call; if the AI is unavailable or invents a number, a plain template is used instead.
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/story">) {
  const { id } = await ctx.params
  const c = await loadCampaign(id)
  if (!c) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  if (c.verifiedRows.length === 0) return NextResponse.json({ error: "No verified photos yet: a story needs at least one photo with trust 80+ or approved." }, { status: 422 })

  const facts: StoryFacts = {
    projectName: c.project.name, activity: c.project.activity_type, description: c.project.description, startDate: c.project.start_date, endDate: c.project.end_date,
    verifiedPhotos: c.verifiedRows.length, totalPhotos: c.totalPhotos, numbers: c.numbers,
    captions: c.verifiedRows.map((r) => r.caption).filter((x): x is string => !!x).slice(0, 8), pairSummary: c.pair?.summary ?? null,
  }

  let narrative: Narrative
  let source: "gemini" | "template" = "gemini"
  let note: string | null = null
  try {
    narrative = await writeStory(facts)
    if (!narrativeGrounded(narrative, factsText(facts))) throw new Error("narrative used a number that is not in the verified facts")
  } catch (err) {
    source = "template"
    note = err instanceof Error ? err.message.slice(0, 160) : "AI unavailable"
    narrative = templateNarrative(facts)
  }

  // Public pages point at stored copies whose faces are blurred inside the file (falls back to on-the-fly pixelation).
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const SLIDE = "c_fill,w_800,h_600,f_jpg,q_auto"
  const copied = c.pair && cloud
    ? (await Promise.all([ensurePublicCopy(c.pair.before), ensurePublicCopy(c.pair.after)])).every(Boolean)
    : false
  const pairUrl = (row: { id: string; secure_url: string }) => (copied && cloud ? publicCopyUrl(cloud, row.id, SLIDE) : reportSlideUrl(row.secure_url))

  const storyId = randomUUID()
  const manifest = {
    schema: "overlook-story/1",
    story: { id: storyId, generated_at: new Date().toISOString(), narrative_source: source },
    project: { id: c.project.id, name: c.project.name, activity_type: c.project.activity_type, start_date: c.project.start_date, end_date: c.project.end_date },
    headline: c.headline, numbers: c.numbers, narrative,
    verified_photos: c.verifiedRows.length, total_photos: c.totalPhotos,
    best_pair: c.pair && {
      before_public_id: c.pair.before.public_id, after_public_id: c.pair.after.public_id,
      before_url: pairUrl(c.pair.before), after_url: pairUrl(c.pair.after), summary: c.pair.summary,
      // the stored after-photo copy with NO transformation: for the "try to remove the blur" check on the story page
      ...(copied && cloud ? { after_public_copy_raw: publicCopyUrl(cloud, c.pair.after.id), after_public_copy_view: publicCopyUrl(cloud, c.pair.after.id, SLIDE) } : {}),
    },
    sources: c.verifiedRows.map((r) => r.public_id).sort(),
  }
  const { error } = await supabase.from("reports").insert({ id: storyId, project_id: id, kind: "social", manifest, manifest_sha256: manifestHash(manifest) })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ storyId, source, note })
}
