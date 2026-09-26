import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { saveAsset } from "@/lib/assets-db"
import { nonceIsGenuine } from "@/lib/capture-server"
import { checkTiming, deviceId, plausibleLocation, sha256Hex, verifySignature, type CapturePayload, type CaptureProof, type PublicKeyJwk } from "@/lib/capture"

export const maxDuration = 30

const payloadSchema = z.object({
  v: z.literal(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  lat: z.number(), lng: z.number(), accuracyM: z.number().nullable(),
  capturedAt: z.string(), nonce: z.string(),
  projectId: z.string().uuid().nullable(), ghostAssetId: z.string().uuid().nullable(),
})
const bodySchema = z.object({
  payload: payloadSchema,
  signature: z.string().min(20).max(200),
  publicKey: z.object({ kty: z.literal("EC"), crv: z.literal("P-256"), x: z.string().max(100), y: z.string().max(100) }),
  upload: z.object({
    public_id: z.string().min(1), asset_id: z.string().optional(), secure_url: z.string().url(), etag: z.string().optional(),
    phash: z.string().nullable().optional(), width: z.number().int().optional(), height: z.number().int().optional(),
  }),
})

const reject = (error: string, status = 400) => NextResponse.json({ error }, { status })

// Step 2: the phone has uploaded the photo to Cloudinary and sends the signed proof. Nothing is trusted until
// the server has checked: our nonce, its age, the signature, and that the STORED file has the signed SHA-256.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return reject("Invalid capture payload")
  const { payload, signature, publicKey, upload } = parsed.data as { payload: CapturePayload; signature: string; publicKey: PublicKeyJwk; upload: z.infer<typeof bodySchema>["upload"] }

  const nonce = nonceIsGenuine(payload.nonce)
  if (!nonce) return reject("Unknown capture session; open the camera again")
  const timing = checkTiming(nonce.issuedAt, payload.capturedAt, Date.now())
  if (!timing.ok) return reject(`Capture rejected: ${timing.reason}`)
  if (!plausibleLocation(payload.lat, payload.lng, payload.accuracyM)) return reject("Capture rejected: the location fix is not usable (turn location on and try again)")
  if (!(await verifySignature(publicKey, payload, signature))) return reject("Capture rejected: the signature does not match the photo details")

  // Replays: a nonce creates one asset only (also enforced by a unique index).
  const { data: used } = await supabase.from("assets").select("id").eq("capture_proof->payload->>nonce", payload.nonce).limit(1)
  if (used?.length) return reject("This capture was already saved", 409)

  // The signed hash must be the hash of the file Cloudinary actually stores.
  const file = await fetch(upload.secure_url)
  if (!file.ok) return reject("Could not read the uploaded photo back to check it", 502)
  const storedHash = await sha256Hex(await file.arrayBuffer())
  if (storedHash !== payload.sha256) return reject("Capture rejected: the stored photo is not the photo that was signed")

  const proof: CaptureProof = { payload, signature, publicKey, deviceId: await deviceId(publicKey), verifiedAt: new Date().toISOString(), verified: true }
  const saved = await saveAsset({
    ...upload, resource_type: "image", taken_at: payload.capturedAt, lat: payload.lat, lng: payload.lng, has_exif: true,
    project_id: payload.projectId, capture_proof: proof,
  })
  if ("error" in saved) return reject(saved.error, 500)
  return NextResponse.json({ asset: saved.asset })
}
