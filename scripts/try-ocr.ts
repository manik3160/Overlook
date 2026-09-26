// Round 2 step 7 test: is the Cloudinary OCR Text Detection add-on active? Uploads ONE small text image with
// ocr: "adv_ocr", prints the text or Cloudinary's answer, deletes the test file. (`explicit` on an existing photo
// silently ignores `ocr` when the add-on is off, so a fresh upload is the reliable check.)
// Enable it in the Cloudinary console: Add-ons -> "OCR Text Detection and Extraction" -> free plan.
// Run: npx tsx scripts/try-ocr.ts
import { config } from "dotenv"
import { v2 as cloudinary } from "cloudinary"

config({ path: ".env.local" })
cloudinary.config({ cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })

async function main() {
  try {
    const r = await cloudinary.uploader.upload("scripts/demo-assets/gps-photo-a.jpg", { public_id: "registry-checks/ocr-try", overwrite: true, ocr: "adv_ocr" })
    const ocr = r.info?.ocr?.adv_ocr
    console.log("OCR is active. status:", ocr?.status, "text:", JSON.stringify(ocr?.data?.[0]?.textAnnotations?.[0]?.description ?? null))
  } catch (e) {
    console.log("OCR not available:", (e as { error?: { message?: string } })?.error?.message ?? e)
  } finally {
    await cloudinary.uploader.destroy("registry-checks/ocr-try", { invalidate: true }).catch(() => null)
  }
}
main()
