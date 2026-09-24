import { NextResponse } from "next/server"
import { z } from "zod"
import { cloudinary } from "@/lib/cloudinary"

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

  const signature = cloudinary.utils.api_sign_request(
    parsed.data.paramsToSign as Record<string, string | number>,
    secret,
  )
  return NextResponse.json({ signature, apiKey })
}
