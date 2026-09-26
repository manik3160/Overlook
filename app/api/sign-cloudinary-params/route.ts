import { NextResponse } from "next/server"
import { z } from "zod"
import { cloudinary } from "@/lib/cloudinary"
import { checkParamsToSign } from "@/lib/sign-policy"

const bodySchema = z.object({
  paramsToSign: z.record(z.string(), z.unknown()),
})

// Returns { signature, apiKey } for a direct browser -> Cloudinary signed upload.
// (The API key is not secret; the API secret never leaves the server.)
export async function POST(request: Request) {
  const secret = process.env.CLOUDINARY_API_SECRET
  const apiKey = process.env.CLOUDINARY_API_KEY
  if (!secret || !apiKey) {
    return NextResponse.json({ error: "Cloudinary API key/secret not set" }, { status: 500 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Body must be { paramsToSign: {...} }" }, { status: 400 })
  }

  // Only our own folders, preset and flags: never public_id/overwrite (that could replace an evidence original).
  const policy = checkParamsToSign(parsed.data.paramsToSign, { preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, nowS: Math.round(Date.now() / 1000) })
  if (!policy.ok) return NextResponse.json({ error: policy.error }, { status: 400 })

  const signature = cloudinary.utils.api_sign_request(
    parsed.data.paramsToSign as Record<string, string | number>,
    secret,
  )
  return NextResponse.json({ signature, apiKey })
}
