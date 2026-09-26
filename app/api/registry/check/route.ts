import { NextResponse } from "next/server"
import { z } from "zod"
import { cloudinary } from "@/lib/cloudinary"
import { registryLookup } from "@/lib/registry-data"

const REGISTRY_FOLDER = "registry-checks"

// Public check: the browser uploaded a photo to the check folder; we read its fingerprints from Cloudinary,
// look them up, and DELETE the file straight away. Only files in the check folder can be touched here.
export async function POST(request: Request) {
  const parsed = z.object({ public_id: z.string().regex(new RegExp(`^${REGISTRY_FOLDER}/[A-Za-z0-9_-]{1,80}$`)) }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid check" }, { status: 400 })
  const id = parsed.data.public_id
  try {
    const res = await cloudinary.api.resource(id, { phash: true })
    const answer = await registryLookup(res.etag ?? null, (res as { phash?: string }).phash ?? null)
    return NextResponse.json({ ...answer, fingerprint: { md5: res.etag ?? null, phash: (res as { phash?: string }).phash ?? null } })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message.slice(0, 160) : "Check failed" }, { status: 502 })
  } finally {
    await cloudinary.uploader.destroy(id, { invalidate: true }).catch(() => null) // never keep a checked photo
  }
}
