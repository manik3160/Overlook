# PROGRESS

| Phase | Status | Notes |
|---|---|---|
| 0 Setup | Done, awaiting user OK | Verified: build, signed route, AI Vision (HTTP 200), 5 tables + `match_assets` via REST. Migration applied by pasting 0001_init.sql into the dashboard SQL Editor (CLI not installed). |
| 1 Upload & storage | Done, awaiting user OK | Own multi-file input (not the Cloudinary widget) + exifr on the real `File` + direct signed upload (`phash: true` in the signed params) + `/api/assets` + `/upload` grid. Verified end-to-end in the browser with generated fixtures (GPS+time, no-EXIF, oversized and .gif rejected); test data removed. |
| 2 AI analysis | Done, awaiting user OK | Cache-first pipeline: Gemini (caption + 6 signals + 3 moderation checks, one call) -> AI Vision tagging (1 call, 10 tags) -> embedding (768d). `garbage_present`/`vegetation` derived from signals. Exact duplicates copy the twin (0 calls). Progress panel on `/upload`, retry route. Verified on 4 test images (+ cache re-run = 0 calls, LOW_CONFIDENCE path); test data removed. |
| 3 Projects, map, timeline | Done, awaiting user OK | `lib/geo.ts` (haversine + greedy clustering, 9 vitest tests), project create/edit/assign APIs, dashboard with auto suggestions, project page with Leaflet map (geofence circle, pins red/green) + timeline by day (IST). Verified in browser with 10 generated EXIF photos; test data removed. No AI credits used. |
| 4 Trust score | Done, awaiting user OK | `lib/trust.ts` + `lib/phash.ts` pure, 32 vitest tests total. Trust recomputed on upload, after analysis, and on project/assignment changes (`lib/trust-db.ts`); badges on grids, `/assets/[id]` with flag reasons + traceability, `/review` queue (approve/reject/undo). Verified live with 16 planted assets; all test data removed. 1 AI Vision call used (the screen photo). |
| 5 Search | Done, awaiting user OK | `/search`: query -> Gemini embedding (in-memory cache) -> `match_assets`, plus project/tag/trust band/date/type filters (filter-only mode when no query). Relevance cutoff = absolute floor 0.75 + 0.06 below best (calibrated: gemini-embedding-001 has a ~0.7 baseline). Verified on 6 real public-domain photos with 8 queries + every filter alone and combined; test data removed. No AI Vision units used. |
| 6 Before/after + scorecard | Done, awaiting user OK | `lib/pairing.ts` + `lib/signals.ts` pure (52 vitest tests total). Before/after sets split at the largest >=3-day gap; pairs one-to-one (<=50 m, >=3 days, closest then embedding). Scorecard on project page, every number links to `/projects/[id]/evidence` (same code, so counts always match). Slider + cached Gemini change summary per pair. Rejected photos excluded. Verified live with 8 photos; test data removed. |
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
- Gemini: vision model default now `gemini-3.1-flash-lite` (override with `GEMINI_VISION_MODEL`). `gemini-3.6-flash` has a FREE-TIER CAP OF 20 REQUESTS/DAY (found in Phase 6); 2.5-flash is closed to new users, embeddings `gemini-embedding-001` @768d. Moderation checks (photo of screen / unrelated / people working) come from the same Gemini call and are cached in `analyses` (kind `gemini_analysis`, `result.checks`) for Phase 4 — this deviates from CLAUDE.md §7.2 (AI Vision moderation) to save credits.
- Order inside `analyzeAsset`: Gemini (free) first, then AI Vision (paid), so a broken Gemini step never burns Vision units.
- Only images are analyzed in Phase 2; videos stay `pending` until Phase 9.
- Phase 3: times are grouped/displayed in IST (`lib/dates.ts`). Suggestions need 3+ GPS photos within 500 m and 60 days; unassigned photos without GPS are assigned manually from a project page.
- Phase 4: trust is computed for pending assets too (dup/geofence/time need no AI); AI-derived flags (PHOTO_OF_PHOTO, IRRELEVANT, LOW_CONFIDENCE) appear after analysis. Only the LATER upload of a duplicate pair is penalised. pHash threshold stays at spec (<=6): a heavily shrunk+recompressed synthetic image hit distance 8, a realistic WhatsApp-style recompress of a natural photo hit 0.
- `/api/analyze/next` accepts optional `ids` to analyse specific assets only (used by the asset page button) — use it in tests to save AI Vision units.
- AI Vision after Phase 4 testing: ~96,250 units remaining (one more ~650 call).
- Phase 5: keep SEMANTIC_SIMILARITY for both docs and queries (RETRIEVAL_* modes separated worse in a local test). Only ANALYSED photos have embeddings, so un-analysed photos cannot be found by description (tags/filters still work). Search fetches top 100 candidates then filters, fine at demo scale. Transcript search comes in Phase 9.
- Phase 6: Gemini free quotas are per model per day (reset midnight Pacific) — a 60-100 photo demo needs a model with a high daily cap. flash-lite passed the screen-photo check and captions/signals. Watch for 429s; the analysis panel waits 30 s and retries. Scorecard denominators count only AI-analysed photos; before/after needs >=3 days between photo times (EXIF).
