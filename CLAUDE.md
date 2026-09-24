# CLAUDE.md

Instructions for Claude Code working in this repository. Read this whole file before doing anything.

---

## 0. How we work (MOST IMPORTANT)

### Phase-by-phase, with hard stops
- Work happens in **phases** (Section 9). Work on **ONE phase at a time**.
- At the start of a session, ask which phase we are on (or read `PROGRESS.md`) and confirm before writing code.
- When a phase's "Done when" checklist is complete, **STOP**. Do not start the next phase, even if it looks small.
- At every stop, reply with exactly:
  1. What was built (2–5 lines)
  2. Files created / changed
  3. How to test it manually (step by step, from a fresh terminal)
  4. Known limitations or shortcuts taken
  5. A suggested commit message
- Then update `PROGRESS.md` (phase status + one-line notes) and wait for the user.

### Git rules
- The user commits and pushes **manually**. Repo: `https://github.com/manik3160/gallery.git` (private).
- **Never** run `git commit`, `git push`, `git reset`, `git rebase`, force operations, or change remotes/branches.
- `git status` and `git diff` are fine for reviewing.
- Never commit secrets. `.env.local` must stay in `.gitignore`. Keep `.env.example` updated with every new variable (empty values).

### UI design is deferred — build functional only
- Do **not** spend time on visual design, custom styling, animations, color systems, or layout polish during Phases 0–9.
- Use plain default shadcn/ui components, stock Tailwind spacing, and no custom theme. Wire everything up so it **works correctly**; it does not need to look good yet.
- The user will design and restyle the UI himself later, separately, using Claude (Artifacts / frontend-design). Don't pre-empt that by inventing a visual identity, picking brand colors, or writing custom CSS beyond basic layout.
- Exception: Phase 10 ("Polish & demo") may only do the minimum needed for the live demo to be legible (e.g. readable trust-score colors with text labels) — not a redesign.
- If a phase's "Done when" needs a UI to test, keep it bare-bones: default components, no design decisions.

### Do NOT over-engineer
This is a 1-person hackathon build. Simplicity beats cleverness.
- One Next.js app. **No** separate backend, microservices, Redis, queues, Docker, Kubernetes, tRPC, GraphQL, monorepo, or state-management libraries.
- No abstraction layers "for later". No repository/service/factory patterns. Plain functions in `lib/`.
- No auth system. Single demo workspace. (Optional: one hardcoded admin password for review actions — only if asked.)
- No i18n framework. Hindi text only where the feature needs it (campaign cards).
- No new dependency without a one-line reason. Prefer what's already installed.
- Tests only for pure logic that is easy to get wrong: trust score, pHash distance, geo math, pairing. Nothing else.
- If a task seems to need something heavy, stop and ask first.

### When unsure
- Cloudinary add-ons and APIs change. If unsure of an exact parameter name, **check the current Cloudinary docs** (or say you're unsure) instead of guessing. Write a small script to test one API call before building on it.
- Ask one clear question rather than guessing on product decisions.

---

## 1. Project summary

**Name:** TBD (placeholder: `gallery`).

**Hackathon:** Code Cubicle 6.0 (Geek Room) · Problem Statement 02 (Cloudinary track) · online round 3 Oct, offline 11 Oct.
All project code must be written during the hackathon.

**One line:** An AI evidence platform for NGOs, CSR teams and government field projects that turns raw field photos/videos into **verified, searchable, measurable** impact evidence — and tells you when a photo is lying.

**Positioning:** Everyone else builds a smart photo gallery. We build an **evidence system**: every photo gets a Trust Score, every metric is traceable to the photos behind it, every report is verifiable by scanning a QR code.

**Why it matters (for pitch, not code):**
- Government schemes (e.g. MGNREGA's NMMS app) require geotagged photos but struggle with fake, reused and photo-of-photo uploads; verification is manual.
- Indian CSR spend is ~₹40,000+ crore/yr; companies need credible impact evidence from NGOs.

---

## 2. Problem statement → feature map

Every PS line must map to a working feature. Do not drop any "Must".

| PS requirement | Feature | Phase |
|---|---|---|
| Analyze & organize **large collections** of image **and video** | Direct-to-Cloudinary uploads, background analysis with status + progress, cache-first analysis, video key frames | 1, 2, 9 |
| Organize by **project, location, timeline** | Auto project suggestions (GPS + time clustering), map view, timeline view | 3 |
| Identify projects, activities, locations, **visual signals** | Custom taxonomy tags (AI Vision), countable visual signals, EXIF GPS | 2 |
| **Verifying** / reliable insights | **Evidence Trust Score** with explainable flags | 4 |
| Searchable via AI metadata, tagging, **semantic discovery** | Tags + filters + pgvector semantic search | 5 |
| Compare **before-and-after** | Auto pairing + slider + AI change summary | 6 |
| **Measurable impact** | Impact Scorecard computed from signals, every number clickable to its photos | 6 |
| Visual reports & summaries | PDF report | 7 |
| **Traceability** to originals **and transformations** | Report manifest with public_ids, transformation URLs, SHA-256 hash, QR → public verify page | 7 |
| Campaign-ready content, **impact stories** | Social cards (faces pixelated), Hindi WhatsApp card, story page | 8 |

---

## 3. Tech stack (fixed — don't change without asking)

- **Next.js** (App Router) + **TypeScript** (strict) + **Tailwind** + **shadcn/ui**
- **Cloudinary**: storage, transformations, Upload Widget via `next-cloudinary`, Node SDK `cloudinary` on the server, add-ons: AI Vision (Analyze API), Duplicate Image Detection (or plain `phash`), video transcription
- **Supabase**: Postgres + **pgvector** (use `@supabase/supabase-js` with the service role key **server-side only**)
- **Gemini** (`@google/genai`): embeddings for semantic search, before/after change summaries, report/story narrative. Use a Flash model. Fallback vision captioning only if AI Vision quota runs out.
- **exifr**: read EXIF (GPS, DateTimeOriginal) in the browser **before** upload (reliable; don't depend on Cloudinary for EXIF)
- **react-leaflet** + OpenStreetMap tiles for maps
- **recharts** for the scorecard charts (only if needed)
- **@react-pdf/renderer** for PDFs, **qrcode** for QR codes
- **zod** for validating API inputs and LLM JSON outputs
- **vitest** for the few pure-logic tests

Deploy: Vercel (only in Phase 10).

---

## 4. Environment variables

`.env.example` (keep in sync):
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Rules: `CLOUDINARY_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` are **server-only**. Never import them into client components. Uploads use a **signed** preset (sign via an API route).

---

## 5. Folder structure (keep it flat)

```
app/
  page.tsx                  # dashboard: projects + upload
  upload/page.tsx
  assets/[id]/page.tsx      # asset detail: tags, signals, trust flags, source links
  projects/[id]/page.tsx    # map, timeline, before/after, scorecard, reports
  search/page.tsx
  review/page.tsx           # flagged evidence queue
  verify/[reportId]/page.tsx  # PUBLIC verification page (QR target)
  story/[projectId]/page.tsx  # public impact story
  api/...                   # route handlers, one folder per action
components/                 # UI only, no business logic
lib/
  cloudinary.ts             # server SDK config + helpers
  supabase.ts               # server client
  gemini.ts
  analysis.ts               # run AI Vision + cache
  trust.ts                  # PURE trust score logic (tested)
  geo.ts                    # haversine, clustering (tested)
  phash.ts                  # hamming distance (tested)
  pairing.ts                # before/after pairing (tested)
  signals.ts                # signal definitions + scorecard math
  taxonomy.ts               # tag definitions
supabase/migrations/        # plain .sql files
scripts/                    # one-off test scripts (e.g. try-ai-vision.ts)
PROGRESS.md
```

---

## 6. Data model (plain SQL, no ORM)

Keep it to these tables. Add columns only when a phase needs them.

```sql
create extension if not exists vector;

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  activity_type text,               -- e.g. 'cleanup', 'plantation', 'pond_restoration'
  center_lat double precision,
  center_lng double precision,
  radius_m integer default 500,     -- simple circular geofence (no polygons)
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  public_id text not null unique,   -- Cloudinary public_id (source of truth for traceability)
  asset_id text,                    -- Cloudinary asset_id
  resource_type text not null,      -- 'image' | 'video'
  secure_url text not null,
  etag text,                        -- md5, exact duplicate check
  phash text,                       -- perceptual hash, near-duplicate check
  width int, height int,
  taken_at timestamptz,             -- EXIF DateTimeOriginal
  lat double precision,             -- EXIF GPS
  lng double precision,
  has_exif boolean default false,
  parent_asset_id uuid references assets(id), -- set for frames extracted from a video
  frame_second numeric,             -- which second of the parent video
  status text default 'pending',    -- pending | analyzing | done | failed
  tags text[] default '{}',
  caption text,
  signals jsonb default '{}',       -- see Section 7.3
  embedding vector(768),
  trust_score int,
  trust_flags jsonb default '[]',   -- [{code, severity, reason, evidence}]
  review_status text default 'unreviewed', -- unreviewed | approved | rejected
  transcript text,                  -- videos
  created_at timestamptz default now()
);

create table analyses (             -- cache of every paid API call. NEVER re-call if a row exists.
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id) on delete cascade,
  kind text not null,               -- 'ai_vision_tagging' | 'ai_vision_moderation' | 'ai_vision_general' | 'gemini_caption' | ...
  input_hash text not null,         -- hash of (kind + asset + prompt), cache key
  result jsonb not null,
  created_at timestamptz default now(),
  unique (asset_id, kind, input_hash)
);

create table pairs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  before_asset_id uuid references assets(id),
  after_asset_id uuid references assets(id),
  distance_m double precision,
  days_apart int,
  change_summary text,
  created_at timestamptz default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  kind text not null,               -- 'donor' | 'csr' | 'social'
  manifest jsonb not null,          -- see Section 7.6
  manifest_sha256 text not null,
  pdf_public_id text,               -- stored in Cloudinary as raw
  created_at timestamptz default now()
);
```
Semantic search: one SQL function `match_assets(query_embedding, match_count, project_filter)` using cosine distance.

---

## 7. Core logic specs

### 7.1 Upload pipeline
1. Browser reads EXIF with `exifr` (GPS + DateTimeOriginal). Missing is fine → `has_exif=false`.
2. **Accepted formats:** jpg, jpeg, png, webp, heic/heif (Cloudinary auto-converts on delivery), mp4, mov, webm. **Max size:** 15 MB image, 100 MB video — reject larger files client-side with a clear message before upload starts (don't let a 4K video hang the demo).
3. Upload directly to Cloudinary via Upload Widget (signed). Folder: `evidence/<project_id or inbox>/`. Request `phash: true`.
4. POST metadata (public_id, asset_id, etag, phash, EXIF) to `/api/assets` → insert row with `status='pending'`.
5. Analysis runs in the background: an `/api/analyze/next` route processes up to N pending assets per call; the UI polls it and shows "412 / 1000 analyzed". No queue system.
6. Before any paid call: if `etag` already exists → mark duplicate, skip AI calls.

### 7.2 AI analysis (cache-first)
- Wrap every Cloudinary add-on / Gemini call in `cachedCall(kind, assetId, input, fn)` that checks `analyses` first.
- AI Vision **tagging**: taxonomy from `lib/taxonomy.ts` (name + description). Start with ~12 tags: tree_plantation, cleanup_drive, garbage_present, water_body, check_dam, handpump, construction_in_progress, construction_complete, community_meeting, classroom, health_camp, vegetation.
- AI Vision **moderation** (yes/no): "Is this a photo of a screen, monitor or printed photograph?", "Does the image show people doing physical work?", "Is this image unrelated to field/community/environmental work?"
- AI Vision **general**: one-sentence factual caption → embed with Gemini (768 dims) → `embedding`.
- Validate every LLM output with zod. On failure: `status='failed'`, show a retry button. Never crash the batch.
- **Low-confidence / unclassifiable images:** if AI Vision tagging returns zero tags, or the general caption call itself fails to produce usable text (too dark, too blurry, unrecognizable), still set `status='done'` — don't fail the asset. Store `tags=[]`, `caption=null`, and add one trust flag `LOW_CONFIDENCE` (severity: info, reason: "couldn't confidently classify this image — needs a human look"). It shows up in `/review` like any other flag; it is not an error state.

### 7.3 Visual signals
Extracted once per image (single AI Vision general / Gemini call returning JSON, cached):
```ts
{ people_working: number, water_present: boolean, garbage_visible: boolean,
  vegetation: 'none'|'sparse'|'dense', structure_stage: 'none'|'in_progress'|'complete',
  safety_gear: boolean }
```

### 7.4 Evidence Trust Score (`lib/trust.ts`, pure function, unit tested)
Start at 100, subtract, clamp 0–100. Each deduction adds a flag with a human-readable reason and the evidence (e.g. matching asset id, distance).

| Check | Rule | Deduction | Flag code |
|---|---|---|---|
| Exact duplicate | same `etag` as another asset | -50 | DUPLICATE_EXACT |
| Near duplicate | pHash Hamming distance ≤ 6 with another asset, esp. in a different project | -40 | DUPLICATE_REUSED |
| Photo of screen/print | moderation answer "yes" | -35 | PHOTO_OF_PHOTO |
| Outside site | GPS distance from project center > radius_m | -25 | OUTSIDE_GEOFENCE |
| Wrong time | taken_at outside project start/end (±7 days) | -15 | OUTSIDE_TIMEFRAME |
| Irrelevant | "unrelated" = yes | -10 | IRRELEVANT |
| No metadata | has_exif = false | cap score at 60 | NO_METADATA (severity: info, "unverifiable, not fake") |

Bands: ≥80 **Verified**, 50–79 **Needs review**, <50 **Suspicious**.
Wording rule: the UI says "flagged for review", never "fake" or "fraud". Humans approve/reject in `/review`.

### 7.5 Projects, before/after, scorecard
- **Auto project suggestions** (`lib/geo.ts`): greedy clustering of unassigned assets — same cluster if within 500 m and 60 days. Show "Suggested project: 34 photos near <lat,lng>, Aug–Sep". User confirms + names it. No DBSCAN library.
- **Pairing** (`lib/pairing.ts`): same project, distance ≤ 50 m, ≥ 3 days apart, earlier = before. For each after-photo pick the best before-photo (closest distance, then embedding similarity). Gemini gets both images → 2–3 sentence factual change summary (cached).
- **Impact Scorecard** (`lib/signals.ts`): compare signals in before vs after sets, e.g. "garbage visible: 18/20 before → 2/22 after", "vegetation dense: 3/15 → 12/15", "evidence coverage: 94%", "avg trust: 87". Every number links to the filtered list of photos behind it.

### 7.6 Reports + traceability
- Manifest JSON: project info, scorecard, and for every asset used: `public_id`, original `secure_url`, the exact transformation URL used in the report, `trust_score`, flags, `taken_at`, `lat/lng`.
- `manifest_sha256` = SHA-256 of the canonical (sorted-keys) manifest JSON.
- PDF includes a QR code → `${NEXT_PUBLIC_APP_URL}/verify/<reportId>`.
- `/verify/[reportId]` (public, read-only): shows the manifest, recomputes the hash and shows ✅ match / ❌ mismatch, lists every asset with links to original and transformation.
- Pitch note: this mirrors the C2PA provenance idea; Cloudinary's C2PA is enterprise-by-request, so we implement a lightweight hash manifest.

### 7.7 Campaign content + story
- Cards via Cloudinary transformation URLs only (no image editing in code): sizes 1080×1080 (Instagram), 1080×1920 (story/WhatsApp status).
- **Always** apply face pixelation to public content (`e_pixelate_faces`). Originals stay untouched for auditors.
- Text overlays for headline metric. Hindi card needs a Devanagari font (e.g. upload Noto Sans Devanagari to Cloudinary and use it in the text overlay) — verify rendering early.
- `/story/[projectId]`: problem → action → result, best before/after pair, 3 scorecard numbers, short narrative written by Gemini **only from verified evidence** (trust ≥ 80 or approved).

### 7.8 Video
- Transcription on upload (Cloudinary auto transcription or Google transcription add-on — check which is available on our plan).
- Key frames: create frame assets from Cloudinary frame-extraction URLs (e.g. start offset `so_<seconds>` + `.jpg`) every ~15 s (max 8 per video) → insert as assets with `parent_asset_id` + `frame_second` → same analysis + trust pipeline. Frame detail page links to the exact second of the original video.

---

## 8. Cost & quota rules
- AI add-ons are billed separately from base credits. Check free units per add-on at signup and note them in `PROGRESS.md`.
- Cache-first, always (Section 7.2). Skip AI calls for exact duplicates.
- Never analyze on page load. Only in the analysis route.
- Keep demo dataset small (~60–100 images, 2–3 short videos).
- If AI Vision quota runs out, switch captioning/signals to Gemini vision via a single flag in `lib/analysis.ts`.

---

## 9. Phases (STOP after each one)

### Phase 0 — Setup
- Next.js + TS + Tailwind + shadcn, env files, Supabase migration from Section 6, Cloudinary SDK config, signed upload route.
- `scripts/try-ai-vision.ts`: tag ONE public image with AI Vision and print the response (proves add-on + credentials work).
- **Done when:** app runs, migration applied, test script prints real AI Vision output, `.env.example` complete.
- Commit: `chore: project setup, db schema, cloudinary + supabase config`

### Phase 1 — Upload & storage
- Upload page with widget (multi-file), EXIF read before upload, `/api/assets` insert, simple grid of uploaded assets with EXIF badge (GPS/time/none).
- **Done when:** uploading 10 phone photos stores them in Cloudinary + DB with correct GPS/time; WhatsApp-forwarded photo shows "no metadata".
- Commit: `feat: upload pipeline with exif extraction`

### Phase 2 — AI analysis pipeline
- `cachedCall`, taxonomy tagging, moderation questions, caption + embedding, visual signals, background processing with progress bar, retry on failure.
- **Done when:** a batch of 20 images reaches `done` with tags, caption, signals, embedding; re-running does NOT call the APIs again (verify via `analyses` rows).
- Commit: `feat: cached ai analysis pipeline (tags, signals, embeddings)`

### Phase 3 — Projects, map, timeline
- Create/edit project (name, activity, center, radius, dates), auto project suggestions, assign assets, project page with map pins + geofence circle + timeline strip grouped by date.
- **Done when:** demo photos auto-suggest the right project, map and timeline render correctly.
- Commit: `feat: projects with map, timeline and auto-grouping`

### Phase 4 — Evidence Trust Score (WOW #1)
- `lib/trust.ts` + tests, compute after analysis, badges on grid, flag reasons on asset page, `/review` queue with approve/reject.
- **Done when:** the 3 planted fakes (photo of screen, reused image, far-away photo) are all flagged with correct reasons; tests pass.
- Commit: `feat: evidence trust score and review queue`

### Phase 5 — Search
- Search page: text query → embedding → `match_assets`, plus filters (project, tag, trust band, date range, image/video).
- **Done when:** "garbage near the road" style queries return sensible results.
- Commit: `feat: semantic search with filters`

### Phase 6 — Before/after + Impact Scorecard
- Pairing, before/after slider component, cached change summary, scorecard at top of project page with clickable numbers.
- **Done when:** cleanup-drive photos produce correct pairs and a scorecard with real numbers.
- Commit: `feat: before/after pairing and impact scorecard`

### Phase 7 — Reports + QR verification (WOW #2)
- Manifest + SHA-256, PDF with scorecard, before/after pairs, evidence table and QR; store PDF in Cloudinary; public `/verify/[reportId]`.
- **Done when:** scanning the QR on a phone opens the verify page showing ✅ hash match and working links to originals and transformations.
- Commit: `feat: verifiable pdf reports with qr traceability`

### Phase 8 — Campaign content + story page
- Card generator (Instagram, WhatsApp status, Hindi variant) with face pixelation, download buttons, `/story/[projectId]`.
- **Done when:** cards render correctly (including Devanagari) with faces blurred; story page uses only verified evidence.
- Commit: `feat: campaign cards and impact story page`

### Phase 9 — Video evidence
- Video upload, transcription, key-frame extraction into the normal pipeline, frame → original second link, transcript searchable.
- **Done when:** a 1–2 min field video produces frames with tags + trust scores and a searchable transcript.
- Commit: `feat: video transcription and key-frame evidence`

### Phase 10 — Polish & demo
- Seed/demo data script, empty/loading/error states, dashboard landing numbers, Vercel deploy, README with setup + architecture diagram + PS mapping table.
- **No visual redesign here** — that's a separate pass the user does himself later. Only fix things that would actively confuse a judge (broken layout, unreadable text, missing labels).
- **Done when:** full demo flow (Section 10) works on the deployed URL twice in a row.
- Commit: `chore: polish, seed data, deploy, readme`

### Stretch (only if everything above is done — ask first)
- S1: Sentinel-2 NDVI cross-check for one precomputed demo site (Copernicus Data Space).
- S2: Highlight reel video via Cloudinary video concatenation + text overlay.

---

## 10. Demo flow (build toward this)
1. Upload ~30 cleanup-drive photos → tagged, grouped into a suggested project, pinned on map + timeline.
2. Three planted fakes get flagged live with reasons.
3. Before/after pair with AI change summary + Impact Scorecard.
4. One click: donor PDF.
5. Judge scans the QR → verify page shows ✅ and traces every photo to its original.
6. Instagram + Hindi WhatsApp cards with faces blurred, and the story page.

Demo data: real geotagged before/after photos from our own cleanup drive (phone location ON), plus deliberately made fakes: photo of a laptop screen, one reused image, one photo taken far from the site, one WhatsApp-forwarded photo (no EXIF).

---

## 11. Code style
- TypeScript strict, no `any` unless justified in a comment.
- Server logic in route handlers + `lib/`. Components stay presentational.
- Small files (< ~200 lines). Descriptive names over comments.
- Handle errors at API boundaries; return `{ error }` JSON with proper status codes.
- UI: clean, minimal, dark-mode friendly shadcn. Trust bands: green / amber / red with text labels (never color alone).
