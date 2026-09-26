// Optional: does Cloudinary's "Facial Attributes Detection" add-on (Microsoft, adv_face) find the masked, small faces
// that the standard `e_pixelate_faces` misses (b-planting: 0 found)? One detection on a temporary copy, then deleted.
// Enable first: Cloudinary console -> Add-ons -> "Facial Attributes Detection" -> free plan.
// Run: npx tsx scripts/try-adv-face.ts [public_id]
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"

config({ path: ".env.local" })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })

async function main() {
  const id = process.argv[2] ?? "evidence/real/b-planting"
  const tmp = "registry-checks/adv-face-try"
  try {
    const src = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_limit,w_2000,h_2000,q_auto,f_jpg/${id}.jpg`
    const r = await cloudinary.uploader.upload(src, { public_id: tmp, overwrite: true, detection: "adv_face", faces: true })
    const adv = r.info?.detection?.adv_face
    console.log(`standard face detection found: ${(r.faces ?? []).length}`)
    console.log(`Facial Attributes add-on found: ${adv?.data?.length ?? 0} (status ${adv?.status})`)
  } catch (e) {
    console.log("Not available:", (e as { error?: { message?: string } })?.error?.message ?? e)
  } finally {
    await cloudinary.uploader.destroy(tmp, { invalidate: true }).catch(() => null)
  }
}
main()
