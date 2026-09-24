# PROGRESS

| Phase | Status | Notes |
|---|---|---|
| 0 Setup | Done, awaiting user OK | Verified: build, signed route, AI Vision (HTTP 200), 5 tables + `match_assets` via REST. Migration applied by pasting 0001_init.sql into the dashboard SQL Editor (CLI not installed). |
| 1 Upload & storage | Done, awaiting user OK | Own multi-file input (not the Cloudinary widget) + exifr on the real `File` + direct signed upload (`phash: true` in the signed params) + `/api/assets` + `/upload` grid. Verified end-to-end in the browser with generated fixtures (GPS+time, no-EXIF, oversized and .gif rejected); test data removed. |
| 2 AI analysis | Not started | |
| 3 Projects, map, timeline | Not started | |
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
- AI Vision quota (measured 2026-09-24): limit 100,000 units; one tagging request cost **487 units** (~200 calls total). Budget Phase 2 accordingly (2 tagging calls + general/moderation per image); cache-first is mandatory.
