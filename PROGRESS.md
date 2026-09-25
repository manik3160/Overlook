# PROGRESS

| Phase | Status | Notes |
|---|---|---|
| 0 Setup | Done, awaiting user OK | Verified: build, signed route, AI Vision (HTTP 200), 5 tables + `match_assets` via REST. Migration applied by pasting 0001_init.sql into the dashboard SQL Editor (CLI not installed). |
| 1 Upload & storage | Done, awaiting user OK | Own multi-file input (not the Cloudinary widget) + exifr on the real `File` + direct signed upload (`phash: true` in the signed params) + `/api/assets` + `/upload` grid. Verified end-to-end in the browser with generated fixtures (GPS+time, no-EXIF, oversized and .gif rejected); test data removed. |
| 2 AI analysis | Done, awaiting user OK | Cache-first pipeline: Gemini (caption + 6 signals + 3 moderation checks, one call) -> AI Vision tagging (1 call, 10 tags) -> embedding (768d). `garbage_present`/`vegetation` derived from signals. Exact duplicates copy the twin (0 calls). Progress panel on `/upload`, retry route. Verified on 4 test images (+ cache re-run = 0 calls, LOW_CONFIDENCE path); test data removed. |
| 3 Projects, map, timeline | Done, awaiting user OK | `lib/geo.ts` (haversine + greedy clustering, 9 vitest tests), project create/edit/assign APIs, dashboard with auto suggestions, project page with Leaflet map (geofence circle, pins red/green) + timeline by day (IST). Verified in browser with 10 generated EXIF photos; test data removed. No AI credits used. |
| 4 Trust score | Not started | |
| 5 Search | Not started | |
| 6 Before/after + scorecard | Not started | |
| 7 Reports + QR | Not started | |
| 8 Campaign + story | Not started | |
| 9 Video | Not started | |
| 10 Polish & demo | Not started | |

## Notes
- Git rule override (user, Phase 0): any git command allowed except deletion and push.
- Stack versions: Next 16, Tailwind 4, shadcn (base-ui variant), zod 4, vitest 5.
- Cloudinary AI Vision tagging accepts max **10** tag definitions per request; the 12-tag taxonomy (§7.2) needs 2 calls in Phase 2.
- AI Vision auth is HTTP Basic (`key:secret`) against `https://api.cloudinary.com/v2/analysis/<cloud>/analyze/ai_vision_tagging`.
- AI Vision tag names must be lower-case alphanumeric or hyphens (**no underscores**): send `tree-plantation` to the API and map back to `tree_plantation` in `lib/taxonomy.ts`.
- AI Vision quota: limit 100,000 units. Measured cost: ~650 units per tagging call with 10 tag definitions. **96,903 remaining after Phase 2 testing** (~149 more images). Pipeline uses 1 Vision call per image; never re-run casually.
- Gemini: vision model `gemini-3.6-flash` (2.5-flash is closed to new users), embeddings `gemini-embedding-001` @768d. Moderation checks (photo of screen / unrelated / people working) come from the same Gemini call and are cached in `analyses` (kind `gemini_analysis`, `result.checks`) for Phase 4 — this deviates from CLAUDE.md §7.2 (AI Vision moderation) to save credits.
- Order inside `analyzeAsset`: Gemini (free) first, then AI Vision (paid), so a broken Gemini step never burns Vision units.
- Only images are analyzed in Phase 2; videos stay `pending` until Phase 9.
- Phase 3: times are grouped/displayed in IST (`lib/dates.ts`). Suggestions need 3+ GPS photos within 500 m and 60 days; unassigned photos without GPS are assigned manually from a project page.
