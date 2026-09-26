import { NextResponse } from "next/server"
import { registryLookup } from "@/lib/registry-data"
import { isMd5, isPhash } from "@/lib/registry"

// Hash-only lookup for partners (funders, auditors): send a file's MD5 and/or Overlook pHash, never the photo.
// GET /api/registry/lookup?md5=<32 hex>&phash=<16 hex>
export async function GET(request: Request) {
  const url = new URL(request.url)
  const md5 = url.searchParams.get("md5")?.toLowerCase() ?? null
  const phash = url.searchParams.get("phash")?.toLowerCase() ?? null
  if ((md5 && !isMd5(md5)) || (phash && !isPhash(phash)) || (!md5 && !phash)) {
    return NextResponse.json({ error: "Give md5 (32 hex) and/or phash (16 hex)" }, { status: 400 })
  }
  const a = await registryLookup(md5, phash)
  return NextResponse.json({ found: a.found, first_seen: a.firstSeen, matches: a.hits.map((h) => ({ kind: h.kind, distance: h.distance, project: h.project, organization: h.organization, first_uploaded: h.firstUploaded, taken: h.taken, trust: h.trust })), projects: a.projects, photos_searched: a.searched })
}
