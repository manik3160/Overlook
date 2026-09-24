import { NextResponse } from "next/server"
import { z } from "zod"
import { cloudinary } from "@/lib/cloudinary"

const bodySchema = z.object({
  paramsToSign: z.record(z.string(), z.unknown()),
})

// next-cloudinary's signatureEndpoint POSTs { paramsToSign } and expects { signature }.
export async function POST(request: Request) {
  const secret = process.env.CLOUDINARY_API_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CLOUDINARY_API_SECRET is not set" }, { status: 500 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Body must be { paramsToSign: {...} }" }, { status: 400 })
  }

  const signature = cloudinary.utils.api_sign_request(
    parsed.data.paramsToSign as Record<string, string | number>,
    secret,
  )
  return NextResponse.json({ signature })
}
