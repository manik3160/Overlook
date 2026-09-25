// Rehearsal check for the whole demo flow (CLAUDE.md §10). Resets and re-seeds the demo data, then walks:
// dashboard -> flags -> analysis -> search -> scorecard/pairs -> donor report -> cards -> story, printing PASS/FAIL.
//   1. start the app:  npm run dev
//   2. run:            npm run check-demo   (an .mts file so top-level await runs as an ES module)
// Uses Gemini's free tier for the pair summaries and the story (a handful of calls); AI Vision is NOT used.
import { execSync } from "node:child_process"
import { config } from "dotenv"
import { FLAG_COPY } from "../components/flag-copy"
config({ path: ".env.local", quiet: true })
const APP = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")
const txt = (h: string) => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!-- -->/g, "").replace(/<[^>]+>/g, "\n").replace(/&#x27;/g, "'").split("\n").map((l) => l.trim()).filter(Boolean)
const get = async (p: string) => (await fetch(APP + p)).text()
const post = async (p: string, b: object = {}) => (await fetch(APP + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })).json()
let fails = 0
const check = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`); if (!ok) fails++ }

console.log("== seed (reset) ==")
const out = execSync("npm run seed -- --reset", { encoding: "utf8" })
const projectIds = [...out.matchAll(/projects\/([0-9a-f-]{36})/g)].map((m) => m[1])
const A = projectIds[0]
check("seed created 2 projects and 1+ pairs", projectIds.length === 2 && /(\d+) before\/after pairs/.test(out))

console.log("== dashboard + review (before any analysis) ==")
const dash = txt(await get("/dashboard")).join(" | ")
check("dashboard: 14 photos, 0 analyzed, 9/14 verified, 6 flagged, 2 projects", /14 photos · 0 videos/.test(dash) && /14 waiting · 0 failed/.test(dash) && /9 of 14 scored photos are verified\. 6 are flagged for review/.test(dash) && /2 projects/.test(dash))
const rev = txt(await get("/review"))
const codeOfTitle = new Map(Object.entries(FLAG_COPY).map(([code, v]) => [v.title, code]))
const flagsOf = (id: string) => {
  const i = rev.findIndex((l) => l === `evidence/demo/${id}`)
  const codes: string[] = []
  // A card ends at its "Open details" link. (A flagged thumbnail prints its label BEFORE the next card's id line, so stopping at the next id would leak it into this card.)
  for (let j = i + 1; i >= 0 && j < rev.length && !rev[j].startsWith("Open details"); j++) { const c = codeOfTitle.get(rev[j]); if (c) codes.push(c) }
  return codes
}
const expect: Record<string, string[]> = { "fake-duplicate": ["DUPLICATE_EXACT"], "fake-reused": ["DUPLICATE_REUSED"], "fake-far": ["OUTSIDE_GEOFENCE"], "fake-old": ["OUTSIDE_TIMEFRAME"], "fake-nometa": ["NO_METADATA"], "fake-screen": ["PHOTO_OF_PHOTO", "IRRELEVANT"] }
for (const [id, want] of Object.entries(expect)) check(`review: ${id} flagged ${want.join("+")}`, JSON.stringify(flagsOf(id)) === JSON.stringify(want), JSON.stringify(flagsOf(id)))
check("review: no genuine photo is flagged", !rev.some((l) => /^evidence\/demo\/(before|after|delhi)-/.test(l)))

console.log("== analysis (real pipeline, cache pre-filled) ==")
let pending = 99, guard = 0
while (pending > 0 && guard++ < 20) { const r = await post("/api/analyze/next", { limit: 3 }); pending = r.counts.pending; if (r.rateLimited) { console.log("  rate limited, waiting 30s"); await new Promise((s) => setTimeout(s, 30000)) } }
const st = await (await fetch(APP + "/api/analyze/status")).json()
check("all 14 analyzed, 0 failed", st.counts.done === 14 && st.counts.failed === 0, JSON.stringify(st.counts))

console.log("== search ==")
const s = async (q: string) => txt(await get("/search?q=" + encodeURIComponent(q))).find((l) => /^\d+ results?$/.test(l)) ?? ""
const boat = await s("a boat on a beach")
check("search 'a boat on a beach' finds photos", /^[1-9]\d* /.test(boat), boat)
const cat = await s("a cat")
check("search 'a cat' finds photos", /^[1-9]\d* /.test(cat), cat)
for (const q of ["spaceship on mars", "quantum physics lecture"]) check(`search nonsense '${q}' returns nothing`, /^0 /.test(await s(q)), await s(q))

console.log("== project: scorecard, pairs, report, cards, story ==")
const proj = txt(await get("/projects/" + A))
const projText = proj.join(" ")
check("phases: before 4 (until 3 Sept), after 5 (from 14 Sept)", /Before ≤ 3 Sept 2026 · 4 photos/.test(projText) && /After ≥ 14 Sept 2026 · 5 photos/.test(projText), (projText.match(/Before ≤[^A]*After ≥[^·]*· \d+ photos/) ?? [""])[0])
check("3 before/after pairs", proj.filter((l) => /days apart · [\d.]+ m apart/.test(l)).length === 3)
for (let i = 0; i < 3; i++) { const r = await post(`/api/projects/${A}/pairs/summarize`, { limit: 2 }); if (r.remaining === 0) break; if (r.rateLimited) await new Promise((x) => setTimeout(x, 30000)) }
const rep = await post(`/api/projects/${A}/reports`, { kind: "donor" })
const ver = txt(await get("/verify/" + rep.report.id)).join(" ")
check("report: verify page says the report is unchanged", /Report unchanged/.test(ver) && !/Report altered/.test(ver))
const pdf = await fetch(`${APP}/api/reports/${rep.report.id}/pdf`)
const buf = Buffer.from(await pdf.arrayBuffer())
check("report: PDF served", pdf.status === 200 && buf.subarray(0, 5).toString() === "%PDF-", `${buf.length} bytes`)
const projHtml = await get("/projects/" + A)
const cards = [...projHtml.matchAll(/<img[^>]*src="(https:\/\/res\.cloudinary\.com[^"]*l_text[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))
check("3 campaign cards present", cards.length === 3)
for (const u of cards) { const r = await fetch(u); check(`card renders (${u.includes("NotoSans") ? "hindi" : u.includes("h_1080/") ? "instagram" : "story"})`, r.status === 200 && (r.headers.get("content-type") ?? "").includes("image/jpeg")) }
check("cards use only verified photos", !cards.some((u) => /fake-(far|screen|nometa|duplicate|reused)/.test(u)))
const story = await post(`/api/projects/${A}/story`)
const sp = txt(await get("/story/" + A)).join(" ")
check("story published", !!story.storyId, `source=${story.source}`)
check("story: verified-only footer and integrity passed", /Built from 7 verified photos \(of 11 uploaded\)/.test(sp) && /Integrity check passed/.test(sp), (sp.match(/Built from[^.]*/) ?? [""])[0])
check("story leaks no planted-problem photo", !/fake-/.test(sp))
console.log(`\n${fails === 0 ? "ALL CHECKS PASSED" : fails + " CHECK(S) FAILED"}`)
process.exit(fails ? 1 : 0)
