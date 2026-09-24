// Tag taxonomy. AI Vision tagging accepts max 10 definitions per request and tag names may only
// contain lower-case letters, digits and hyphens, so `apiName` differs from `name`.
// Tags with from:"signal" are derived from Gemini's visual signals (free) instead of AI Vision.
export type TagDef = { name: string; description: string; from: "vision" | "signal" }

export const TAXONOMY: TagDef[] = [
  { name: "tree_plantation", description: "Saplings or trees being planted, or a freshly planted plantation area", from: "vision" },
  { name: "cleanup_drive", description: "People collecting or clearing litter and waste as part of a cleanup activity", from: "vision" },
  { name: "water_body", description: "A pond, lake, river, canal or other body of water is visible", from: "vision" },
  { name: "check_dam", description: "A small check dam or stone/concrete barrier built across a stream or drain", from: "vision" },
  { name: "handpump", description: "A hand pump or tube well for drinking water", from: "vision" },
  { name: "construction_in_progress", description: "A building or structure that is being built, with scaffolding, materials or workers", from: "vision" },
  { name: "construction_complete", description: "A finished building or structure that looks complete and in use", from: "vision" },
  { name: "community_meeting", description: "A gathering of villagers or community members sitting or standing together for a meeting", from: "vision" },
  { name: "classroom", description: "A classroom or school setting with students or a teacher", from: "vision" },
  { name: "health_camp", description: "A medical or health camp with health workers examining or treating people", from: "vision" },
  { name: "garbage_present", description: "Litter or garbage visible (derived from the garbage_visible signal)", from: "signal" },
  { name: "vegetation", description: "Trees, grass or plants visible (derived from the vegetation signal)", from: "signal" },
]

export const visionTagDefs = () =>
  TAXONOMY.filter((t) => t.from === "vision").map((t) => ({ name: t.name.replaceAll("_", "-"), description: t.description }))

export const fromApiName = (apiName: string) => apiName.replaceAll("-", "_")
