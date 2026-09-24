import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"

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
  const b = parsed.data

  const { data, error } = await supabase
    .from("assets")
    .upsert(
      {
        public_id: b.public_id,
        asset_id: b.asset_id ?? null,
        resource_type: b.resource_type,
        secure_url: b.secure_url,
        etag: b.etag ?? null,
        phash: b.phash ?? null,
        width: b.width ?? null,
        height: b.height ?? null,
        taken_at: b.taken_at ?? null,
        lat: b.lat ?? null,
        lng: b.lng ?? null,
        has_exif: b.has_exif,
        status: "pending",
      },
      { onConflict: "public_id" },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset: data })
}
