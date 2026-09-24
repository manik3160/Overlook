// Proves credentials + AI Vision add-on work: tags ONE public image and prints the raw response.
// Run: npm run try-ai-vision [imageUrl]
import { config } from "dotenv"

config({ path: ".env.local" })

const DEFAULT_IMAGE =
  "https://res.cloudinary.com/demo/image/upload/samples/landscapes/beach-boat.jpg"

const tagDefinitions = [
  { name: "water_body", description: "A lake, pond, river, sea or other body of water is visible" },
  { name: "vegetation", description: "Trees, grass or other plants are clearly visible" },
  { name: "garbage_present", description: "Litter or garbage is visible on the ground or in water" },
]

async function main() {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const key = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET
  if (!cloud || !key || !secret) {
    throw new Error("Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env.local")
  }

  const uri = process.argv[2] ?? DEFAULT_IMAGE
  const res = await fetch(`https://api.cloudinary.com/v2/analysis/${cloud}/analyze/ai_vision_tagging`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
    },
    body: JSON.stringify({ source: { uri }, tag_definitions: tagDefinitions }),
  })

  const body = await res.text()
  console.log(`HTTP ${res.status} for ${uri}`)
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2))
  } catch {
    console.log(body)
  }
  if (!res.ok) {
    console.error("\nAI Vision call failed. Check credentials and that the AI Vision add-on is enabled.")
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
