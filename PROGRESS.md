# PROGRESS

| Phase | Status | Notes |
|---|---|---|
| 0 Setup | Built, awaiting user verification | Scaffold, env template, migration, Cloudinary/Supabase libs, signed upload route, AI Vision script. Migration + AI Vision run need user's accounts/keys. |
| 1 Upload & storage | Not started | |
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
- AI Vision free units: _TBD — fill in from Cloudinary console after enabling the add-on (§8)._
