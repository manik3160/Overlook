import { NextResponse } from "next/server"
import { z } from "zod"
import { saveAsset } from "@/lib/assets-db"

const bodySchema = z.object({
  public_id: z.string().min(1),
  asset_id: z.string().optional(),
  resource_type: z.enum(["image", "video"]),
  secure_url: z.string().url(),
  etag: z.string().optional(),
  phash: z.string().nullable().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  taken_at: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  has_exif: z.boolean(),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid asset payload", details: parsed.error.issues }, { status: 400 })
  }
  const saved = await saveAsset(parsed.data)
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 500 })
  return NextResponse.json({ asset: saved.asset })
}
