// Step 7 test: Cloudinary AI Vision GENERAL mode as a yes/no second opinion ("photo of a screen or print?").
// Run: npx tsx scripts/try-ai-vision-general.ts <public_id> [<public_id>...]
import { config } from "dotenv"

config({ path: ".env.local" })
const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const auth = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString("base64")
const PROMPT = "Answer with one word, yes or no. Is this a photograph of a screen, monitor, phone display or a printed photograph, rather than a direct photo of a real scene?"

async function main() {
  for (const id of process.argv.slice(2)) {
    const uri = `https://res.cloudinary.com/${cloud}/image/upload/c_limit,w_1024,h_1024,f_jpg,q_auto/${id}.jpg`
    const res = await fetch(`https://api.cloudinary.com/v2/analysis/${cloud}/analyze/ai_vision_general`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ source: { uri }, prompts: [PROMPT] }),
    })
    const body = await res.json()
    console.log(id, "HTTP", res.status, "answer:", JSON.stringify(body?.data?.analysis?.responses), "quota:", JSON.stringify(body?.limits?.addons_quota ?? body?.error))
  }
}
main()
