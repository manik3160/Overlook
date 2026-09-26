import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { templateMilestones } from "./lib/milestones"
config({ path: ".env.local" })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const P = "1b8ec09e-8143-49b5-b450-bce09e0eb55e", BASE = "http://localhost:3000"
const call = async (method: string, path: string, body?: unknown) => { const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json() as Record<string, unknown> } }
async function main() {
  const col = await sb.from("projects").select("milestones").eq("id", P).single()
  console.log("column:", col.error ? "MISSING " + col.error.message : "ok, current = " + JSON.stringify(col.data.milestones))
  if (col.error) return
  // 1. validation: over 100% refused
  const bad = templateMilestones("cleanup", "2021-04-01", "2021-07-15").map((m) => ({ ...m, releasePct: 50 }))
  console.log("over 100% ->", (await call("PUT", `/api/projects/${P}/milestones`, { milestones: bad })).status)
  // 2. save the template (plus a tiny "any 2 photos" stage we know is ready)
  const ms = templateMilestones("cleanup", "2021-04-01", "2021-07-15")
  ms[1] = { ...ms[1], rule: { ...ms[1].rule, minVerified: 2 } }
  console.log("save ->", JSON.stringify((await call("PUT", `/api/projects/${P}/milestones`, { milestones: ms })).body))
  // 3. certificate for a NOT-ready stage is refused
  console.log("cert for 'done' ->", JSON.stringify(await call("POST", `/api/projects/${P}/milestones/done/certificate`)))
  // 4. certificate for a ready stage
  const ok = await call("POST", `/api/projects/${P}/milestones/progress/certificate`)
  console.log("cert for 'progress' ->", JSON.stringify(ok))
  console.log(JSON.stringify({ cert: ok.body.certificateId }))
}
main()
