# DESIGN.md: Overlook frontend specification

> **Live preview:** https://claude.ai/artifact/WC66ShRfYt8R7BaWpyRQTK. It opens on the landing page; scroll it, then
> press "Open the ledger" for the app (dashboard, project, photo, review, verify). All preview data is sample data.
>
> **Single source of truth for the Overlook frontend.** If this file and the current UI disagree, this file wins.
> If this file and `CLAUDE.md` disagree on *visual* matters, this file wins. `CLAUDE.md` §0 said UI was deferred;
> this document is that deferred design pass. On *behaviour, data, wording rules, and scope*, `CLAUDE.md` still wins.

**Scope rule (read first).** This is a restyle and re-layout of features that **already exist**. The spec adds no
new product features, API routes, or AI calls. Every screen below renders data that the current pages already
load. The only data changes allowed are the small **query-only** additions listed in §14.3, such as selecting
`secure_url` so a thumbnail can be shown. Do not change `lib/` logic, trust math, pairing, scorecard math, manifests,
or card URLs. §14.2 lists the one small refactor that is allowed, and it changes no behaviour.

**One scope exception, requested by the user:** a public **landing page at `/`** (§8.0) whose scroll animation proves
the concept on one photo. The dashboard moves from `/` to **`/dashboard`** (§8.1). The landing page describes only
features that already exist; it adds no product behaviour.

---

## Table of contents

1. Design concept
2. What "no AI slop" means here (hard bans)
3. References and what we took from each
4. Foundations: color, type, spacing, radius, elevation, grid, iconography
5. Motion system
6. App shell and navigation
7. Component library (specs, variants, states)
8. Page specs (every route)
9. Signature moments (the proof-of-concept animations)
10. Content and copy rules
11. Responsive behaviour
12. Accessibility
13. Edge cases and system states
14. Implementation notes for Claude Code (files, order, tokens CSS, allowed data changes)
15. Acceptance checklist

---

## 1. Design concept: "Chain of Custody"

Overlook is not a gallery. It is an **evidence ledger**. The interface should feel like the working desk of an auditor
or an investigative photo desk: calm, precise, and dense where density helps. Nothing in it is decorative.

Three ideas drive every decision:

1. **Receipts, not claims.** Every number is a link to the photos behind it. Every verdict shows its arithmetic.
   Every photo shows where it came from. The UI proves the concept on every screen instead of describing it.
2. **Colour means something.** The interface is monochrome ink on a dark or paper ground. Colour appears only
   where it carries meaning:
   - **green, amber and red** for trust bands;
   - **one cold blue** ("cyanotype") for provenance: links to originals, hashes, the selection and focus ring.

   If something is coloured, it is telling you something.
3. **Show the math.** A score of 65 alone is a claim. `100 − 35 (photo of a screen) = 65` is evidence. Wherever the
   product computes something (trust, scorecard, report hash), the UI shows the computation.
4. **Evidence develops.** This is the visual signature, and nothing else in the category looks like it (§4.9).
   A photo nobody has checked yet is shown as a **cyanotype**: the 19th-century Prussian-blue photographic print. As
   the photo passes its checks it **develops into full colour**. A flagged photo stays blue and gets red **crop marks**,
   like a photo editor marking a print. Blue therefore always means "not proven yet", from the landing page to the
   dashboard bars to the verify page.

Visual language: hairline rules (1px), mono uppercase eyebrows with numbered sections (`01 SCORECARD`, each on a blue highlighter mark), and tabular
figures. Photos have square corners, because photos are evidence and not decoration. The layout sits on a strict
grid and is generous with whitespace between sections. It is dense inside tables and ledgers.

Tone of voice: plain, factual, specific. "Flagged for review: 1.8 km from the site (geofence 500 m)." It never says "AI-powered ✨".

---

## 2. Hard bans (the anti-slop list)

Claude Code must not introduce any of these. A PR that contains one is wrong.

| Banned | Use instead |
|---|---|
| Purple, indigo, or violet gradients; "aurora" or mesh backgrounds; radial glows; blurred colour blobs | Flat surfaces. The only gradient allowed is a black scrim on photos, for label legibility (§4.6). |
| Glassmorphism (`backdrop-blur` cards), frosted nav | Opaque surfaces with a 1px hairline. The top bar may use `bg-bg/90` **without blur**. |
| Sparkle ✨ / magic-wand / robot icons to mean "AI" | Say what happened: "Captioned", "Tagged", "Scored". AI is an implementation detail, not a badge. |
| Emoji in UI (including ✅ ❌ on the verify page) | Lucide icons (`Check`, `X`, `TriangleAlert`) plus words. |
| Gradient text, text shadows, and neon on dark | Solid `--fg`, with weight contrast (300 against 600) for emphasis. |
| `rounded-2xl`/`3xl` bubbly cards, pill-shaped everything | Radius 0 for photos, 4px for controls, 6px for panels (§4.4). |
| Drop shadows on cards | A 1px `--line` border. Shadows only on floating layers (popover, sheet). |
| Centred marketing hero, 3-feature icon grid, fake testimonials, "Trusted by" logos | The dashboard opens with **real numbers** from the workspace. |
| Rainbow or categorical colours in data | Data is ink; only trust uses colour; before/after uses fg-3 against fg. |
| Bouncy or spring overshoot, parallax, scroll-jacking, confetti | Short, decelerating motion (§5). One signature animation per page at most. |
| Colour used as the only signal | Every band shows **label + score + mark shape** (§7.3). |
| "Fake", "fraud", "AI detected fraud!" | "Flagged for review" (a hard wording rule from CLAUDE.md). |
| Default Tailwind palette values (`green-500`, `blue-600` …) | Only the tokens in §4.1. |

---

## 3. References (market check) and what we took

We studied these products. We borrow principles from them, not their look.

| Reference | What we take | What we leave |
|---|---|---|
| **Code Cubicle 6.0 PS-02 brief** (the judges' document) | Mono, letter-spaced, numbered eyebrows (`PROBLEM STATEMENT 02`); weight-contrast headline (bold word + light words); hairline dividers; dark ground. Judges will feel at home. | The teal accent (it collides with our green "Verified") and the radial glow. |
| **Linear** | Keyboard-first triage (j/k, shortcuts), dense lists, a quiet chrome that lets the content lead. | The purple brand and gradients. |
| **Vercel dashboard** | Status dots and state-driven rows (Queued, Building, Ready maps to Pending, Analyzing, Done); monochrome UI with semantic colour only. |, |
| **Stripe Dashboard / Mercury** | Tabular numbers; every figure drills down; money-grade seriousness. | Illustration style. |
| **Forensic Architecture / Bellingcat investigations** | An evidence-first presentation: annotated media, coordinates and timestamps shown as first-class data, chains of custody. | Their editorial darkness and density on public pages. |
| **Our World in Data** | Honest charts: the numerator and denominator are always visible ("18/20"), and a source link sits under every figure. |, |
| **Apple Photos (Places) / Felt** | A calm, desaturated base map so the pins carry the colour. | Colourful base tiles. |
| **Swiss / International Typographic Style** | A strict grid, left-aligned text, hierarchy through size and weight, not boxes. | Nothing to leave. |

---

## 4. Foundations

### 4.1 Colour tokens

There are two themes, and both are first-class. **The default is dark ("Darkroom")**, which matches the brief's look
and suits the live demo. The light theme ("Paper") is used when the OS prefers light or the user toggles it.
Public pages (`/verify`, `/story`) follow the same tokens.

Warm-neutral greys are used deliberately: they are not blue-black and not Tailwind `neutral`. Hex values are final.

| Token | Dark (default) | Light | Usage |
|---|---|---|---|
| `--bg` | `#0D0D0C` | `#F5F4F0` | Page background |
| `--surface-1` | `#141413` | `#FBFAF8` | Panels, cards, table body |
| `--surface-2` | `#1B1B19` | `#EFEEE9` | Hover rows, input background, sunken wells |
| `--surface-3` | `#242421` | `#E6E4DD` | Pressed state, selected row, skeleton |
| `--line` | `#2A2A27` | `#E0DED7` | Hairline borders and dividers |
| `--line-strong` | `#3A3A36` | `#C9C6BD` | Input borders, emphasised rules |
| `--fg` | `#EDECE7` | `#141412` | Primary text, primary button fill |
| `--fg-2` | `#A8A69E` | `#52504A` | Secondary text, labels |
| `--fg-3` | `#85837B` | `#6D6B64` | Meta text, eyebrows, placeholders (≥ 4.5:1 on `--bg`) |
| `--accent` | `#8FA7F2` | `#2F4FC4` | "Cyanotype": provenance links, hashes, focus ring, selection, progress fill |
| `--accent-tint` | `#161C2E` | `#E4E9F8` | Selected tile background, hash highlight |
| `--verified` | `#6FCF97` | `#237A4B` | Band text and mark |
| `--verified-tint` | `#11271A` | `#E3F0E7` | Band background |
| `--review` | `#E9B44C` | `#8A5600` | Band text and mark |
| `--review-tint` | `#2B2210` | `#F7EBD2` | Band background |
| `--suspicious` | `#F2877B` | `#B3261E` | Band text and mark; destructive actions |
| `--suspicious-tint` | `#2E1512` | `#F8E1DE` | Band background |
| `--scrim` | `rgba(0,0,0,.62)` | `rgba(0,0,0,.62)` | Label background on top of photos (both themes) |

Rules:
- **Primary buttons are ink.** They use `--fg` fill with `--bg` text. They are not blue. Blue is reserved for provenance and focus.
- **Before/after** is never red or green (red and green mean trust). "Before" text is `--fg-3` and "After" text is `--fg`.
  Bars are `--line-strong` for before and `--fg` for after.
- The info severity (`NO_METADATA`, `LOW_CONFIDENCE`) is **neutral**: `--fg-2` text with a dashed `--line-strong` border.
  It means "unverifiable, not fake". It must never look like a warning.
- Map: geofence ring is `--accent`, dashed. Pins inside the geofence use `--verified` and pins outside use
  `--suspicious`. Pins get their colour from the flag, not from the trust band, which matches the current logic.
- Contrast: every text/background pair above is ≥ 4.5:1. Band text on its tint is ≥ 4.5:1 in both themes.

### 4.2 Typography

Three families, one job each. All three are on Google Fonts and load through `next/font/google`, which
self-hosts them at build time (no npm dependency, no runtime request to Google).

| Role | Family | Why this face |
|---|---|---|
| **Display** (h1, h2, hero figures in prose, story headline) | **Funnel Display** (variable 300–800) | A 2024 grotesk with slightly squared, "instrument" terminals. It feels current without being one of the over-used safe faces. Its light weights carry the brief's bold-word/light-words headline pattern well. |
| **UI and body** | **Funnel Sans** (variable 300–800, with italics) | The text companion to Funnel Display, so display and body share one skeleton. It is calm at 13–15px and has tabular figures. |
| **Data** (IDs, hashes, coordinates, times, scores, eyebrows) | **Martian Mono** (variable weight **and width** 75–112.5%) | The ledger voice. Its width axis lets one family do two jobs: **wide (112.5%) for uppercase eyebrows**, which gives the letter-spaced feel of the PS brief, and **condensed (75%) for 64-character SHA-256 hashes**, so they fit on a phone. |

Do not use Inter, Space Grotesk or Instrument Serif. They are the current "AI template" faces (see §2). Remove
Geist from `layout.tsx` as well: keeping it beside Funnel would add a fourth family for no gain.

```ts
// app/layout.tsx
import { Funnel_Display, Funnel_Sans, Martian_Mono } from "next/font/google"
const display = Funnel_Display({ subsets: ["latin"], variable: "--font-display" })
const sans = Funnel_Sans({ subsets: ["latin"], variable: "--font-body" })
const mono = Martian_Mono({ subsets: ["latin"], variable: "--font-data", axes: ["wdth"] })
// <html className={`${display.variable} ${sans.variable} ${mono.variable} dark`}>
```

(Verified: `next/font/google` in the installed Next 16.3.6 exports `Funnel_Display`, `Funnel_Sans` and `Martian_Mono`,
and lists Martian Mono's `wdth` axis.)

> **Bug to fix first:** `app/globals.css` contains `--font-sans: var(--font-sans)` (a self-reference), so every page
> currently falls back to Times. The new mapping in §14.4 fixes this.

Font features: `font-variant-numeric: tabular-nums` on **every** number that sits in a column or changes (scores,
counts, coordinates, times). Martian Mono is already monospaced, and Funnel Sans needs `tabular-nums` explicitly.

| Token (utility) | Family | Size / line-height | Weight | Width / tracking | Use |
|---|---|---|---|---|---|
| `text-display` | Display | 56 / 60 (mobile 36 / 40) | 300, with one 600 word | −0.03em | Public story headline |
| `text-h1` | Display | 34 / 40 (mobile 27 / 32) | 300 + 600 (see below) | −0.025em | Page titles |
| `text-h2` | Display | 19 / 26 | 600 | −0.01em | Section titles |
| `text-title` | Sans | 15 / 22 | 600 | 0 | Card titles, flag titles, table emphasis |
| `text-body` | Sans | 15 / 24 | 400 | 0 | Paragraphs, summaries |
| `text-small` | Sans | 13 / 20 | 400 | 0 | Helper text |
| `text-eyebrow` | Mono | 10.5 / 16 | 500 | **width 112.5%**, +0.14em, UPPERCASE | Section eyebrows, table headers, field labels |
| `text-data-xl` | Mono | 40 / 42 (mobile 30 / 32) | 300 | width 81%, −0.03em | Hero figures (stats, scorecard, trust total) |
| `text-data` | Mono | 12 / 20 | 400 | width 87.5% | public_ids, coordinates, timestamps, table numbers |
| `text-hash` | Mono | 12.5 / 20 | 400 | **width 75%** | SHA-256, etag, pHash |
| `text-micro` | Mono | 9.5 / 14 | 600 | width 100%, +0.08em, UPPERCASE | Chips on photos, timecodes, day labels |

Width is set with `font-stretch` (for example `font-stretch: 112.5%`). This works because Martian Mono is loaded
with the `wdth` axis.

**Weight-contrast headline pattern** (taken from the brief). Page titles set most words at 300 and the key noun at 600:
- Dashboard: `<span class="font-semibold">Evidence</span> ledger`
- Project: `<span class="font-semibold">{project.name}</span>`. User-entered names are fully 600; do not split them.
- Verify: `Report <span class="font-semibold">unchanged</span>` / `Report <span class="font-semibold">altered</span>`

**Eyebrow pattern (blue highlighter mark).** A section label is mono uppercase text on a solid `--accent-ink` "marker
stroke" with `--bg` text (`padding: 2px 8px`, `box-decoration-break: clone` so a wrapped label keeps the mark on every
line, square corners). A leading number is bold and sits inside the mark with spacing, not punctuation: `01  SCORECARD`.
This replaces the old 24px rule, which read as a row of em dashes. Tokens do the inversion: in the Paper theme it is
`#2F4FC4` on off-white, and inside the cyanotype chapter (`--accent-ink` remapped to `#D2DCFB`) it turns pale blue on
Prussian blue. Only section starts and page eyebrows are marked. Table headers and field labels stay plain grey
(`<Eyebrow mark={false}>`). In the ASCII sketches below, a line starting with `── LABEL` means a highlighted eyebrow.

Max line length for body text is 68ch.

### 4.3 Spacing

The base unit is 4px. Use Tailwind's default spacing scale. Named usages:

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `space-hair` | 4px | `1` | Icon and text gap inside badges |
| `space-xs` | 8px | `2` | Inline gaps, chip gaps |
| `space-sm` | 12px | `3` | Control internal padding (y), list row gap |
| `space-md` | 16px | `4` | Card padding (mobile), grid gap for tiles |
| `space-lg` | 24px | `6` | Card padding (desktop), page gutter (desktop) |
| `space-xl` | 40px | `10` | Between blocks inside a section |
| `space-2xl` | 64px | `16` | Between numbered sections (desktop) |
| `space-3xl` | 96px | `24` | Public-page section rhythm |

Page gutters are 16px on mobile, 24px from `md` up, and 32px from `xl` up.

### 4.4 Radius

| Token | Value | Use |
|---|---|---|
| `radius-0` | 0 | **All photos, thumbnails, maps, the slider**: evidence has square corners |
| `radius-sm` | 4px | Buttons, inputs, badges, chips, kbd |
| `radius-md` | 6px | Panels, cards, popovers, sheets |

Set shadcn `--radius: 0.375rem` (6px). Nothing is rounder than 6px. The only exception is status dots, which are circles.

### 4.5 Elevation

- Level 0: flat on `--bg`.
- Level 1 (panel): `--surface-1` + 1px `--line`. **No shadow.**
- Level 2 (popover, tooltip, dropdown, sheet, dialog): `--surface-1` + 1px `--line-strong` +
  `box-shadow: 0 16px 40px -12px rgb(0 0 0 / .45)` in dark or `rgb(0 0 0 / .18)` in light.
- Dialog backdrop: `rgb(0 0 0 / .6)`, **no blur**.

### 4.6 Photos

- `object-fit: cover` in tiles and `contain` on the asset page. Background is `--surface-2` while loading.
- Labels on top of photos (BEFORE, AFTER, timecode) sit on a `--scrim` block with 4px × 6px padding in `text-micro` white.
  Never put text directly on a photo.
- The only gradient in the product is on photo tiles that carry bottom labels: `linear-gradient(to top, rgb(0 0 0 / .55), transparent 40%)`.
- Always request sized Cloudinary transformations. Use the existing `thumbUrl` (240²) and `slideUrl` (800×600).
  For the asset page, keep the existing `c_limit,w_900`. **Do not** load originals into grids.

### 4.7 Layout grid

- Container: `max-width: 1280px`, centred, with the gutters from §4.3. Public pages use `max-width: 880px`.
- A 12-column grid with a 24px gap (16px on mobile).
- Breakpoints (Tailwind defaults): `sm 640`, `md 768`, `lg 1024`, `xl 1280`.
- Thumbnail grid: `grid-template-columns: repeat(auto-fill, minmax(168px, 1fr))` with a 16px gap. On mobile use 2 columns with a 8px gap.

### 4.8 Iconography

Use `lucide-react` (already installed), at `strokeWidth={1.5}`, 16px inline and 20px in empty states. Icons always
come with a text label, except icon buttons, which must have an `aria-label` and a tooltip.
Fixed mapping, used consistently:

| Meaning | Icon |
|---|---|
| Upload | `ArrowUpFromLine` |
| Search | `Search` |
| Review queue | `ListChecks` |
| Project | `MapPinned` |
| GPS present / absent | `MapPin` / `MapPinOff` |
| Time present / absent | `Clock` / `ClockAlert` |
| Verified | `Check` in a square mark |
| Needs review | `Minus` in a square mark |
| Suspicious | `X` in a square mark |
| Duplicate / reused | `Copy` |
| Photo of screen | `MonitorSmartphone` |
| Outside geofence | `LocateOff` |
| Outside timeframe | `CalendarX` |
| Irrelevant | `CircleSlash` |
| No metadata / low confidence (info) | `Info` |
| Hash / integrity | `Fingerprint` |
| Original / external | `ArrowUpRight` |
| Video / frame | `Film` / `Frame` |
| Report PDF | `FileText` |
| QR / verify | `QrCode` |

### 4.9 Signature: cyanotype developing, crop marks, contact sheets

This is what makes Overlook recognisable at a glance. Use it consistently, and only with the meanings below.

**Cyanotype tokens.** These are identical in both themes, because they are a print colour, not a UI surface.

| Token | Value | Use |
|---|---|---|
| `--cy` | `#0F2A63` | Prussian-blue ground: the landing page's "Prove" chapter and the CTA band |
| `--cy-2` | `#14336F` | Panels on the cyanotype ground |
| `--cy-line` | `#2B4A8C` | Hairlines on the cyanotype ground |
| `--cy-fg` / `--cy-fg2` / `--cy-fg3` | `#EEF2FB` / `#BFCBEA` / `#98AAD8` | Text on the cyanotype ground (all ≥ 4.5:1) |
| `--paper` / `--ink` | `#F3F1EA` / `#15140F` | The printed report sheet (the PDF look) |
| `--flag` | `#C8372A` | The flag label chip *on top of a photo* (photos are theme-independent, so this is fixed) |

**Duotone ("undeveloped").** The photo is mapped from luminance onto Prussian blue: dark `rgb(9 28 70)`, light
`rgb(228 235 248)`. In the app, implement it with **one inline SVG filter** defined once in the root layout, applied
with `filter: url(#cyanotype)`:

```html
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
  <filter id="cyanotype" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer>
      <feFuncR type="table" tableValues="0.035 0.894"/>
      <feFuncG type="table" tableValues="0.110 0.922"/>
      <feFuncB type="table" tableValues="0.275 0.973"/>
    </feComponentTransfer>
  </filter>
</svg>
```

"Develop" = transition from the filtered image to the unfiltered one. Stack two `<img>` elements (the same URL, so it
is cached once): the top one carries the filter, and its `opacity` goes 1 → 0 over 1200ms `--ease`. Never animate
`filter` itself, because it is slow.

When a photo is shown undeveloped, and when it develops:

| Where | State → look |
|---|---|
| Landing hero contact sheet | All frames start undeveloped. Frames develop one by one; the flagged ones stay undeveloped and get crop marks and a label. |
| App: EvidenceTile, contact sheets | `status` is pending, analyzing or failed → undeveloped plus a `PENDING`/`FAILED` chip. Band **Suspicious**, or unreviewed with a high-severity flag → undeveloped plus red crop marks plus the first flag's title as a label. Everything else → full colour. It develops live when analysis finishes (§7.15 refresh). |
| Asset page main image | **Always full colour.** Reviewers must see the real photo. Only the small thumbnails follow the rule above. |
| Before/after slider, verify page, story page, PDF | Always full colour (they only show verified or public content). |

Hovering or focusing an undeveloped tile in the app develops it temporarily (300ms), so nothing is ever hidden from a
reviewer.

**Crop marks.** Four L-shaped corner marks, 12px arms, 1.5px thick, set 5px outside the photo edge (the classic
darkroom or print-editor mark). They mean "this frame is being looked at":
- `--fg` crop marks on hover or focus of any evidence tile;
- `--suspicious` crop marks, always visible, on flagged frames.

Implement them as one absolutely positioned `<span class="marks">` with 8 `linear-gradient` backgrounds, or 4 small
bordered spans. No images.

**Contact sheet.** Where several photos are shown as a set (the landing hero, the dashboard "Latest evidence"), frame
them like a film contact sheet:
- a `--surface-1` panel;
- mono "edge print" lines above and below (`ROLL 01 · YAMUNA GHAT` … `12 FRAMES`);
- a mono frame number under each frame (`07 · 3 SEP`, or `08 · FLAGGED`).

This is a real convention of photo desks, and it keeps the grid from looking like a generic gallery.

---

## 5. Motion system

Motion exists to **explain state changes and show the math**. It is never decoration.

| Token | Duration | Easing | Use |
|---|---|---|---|
| `--dur-1` | 120ms | `cubic-bezier(0.2, 0, 0, 1)` | Hover and press colour changes, focus ring |
| `--dur-2` | 200ms | `cubic-bezier(0.2, 0, 0, 1)` | Popovers, row expand, tab indicator, tile select |
| `--dur-3` | 320ms | `cubic-bezier(0.3, 0, 0, 1)` | Sheet or dialog in; section reveal |
| `--dur-4` | 700ms total | `cubic-bezier(0.3, 0, 0, 1)` | Signature sequences (§9) |
| exit | 0.75 × the enter duration | `cubic-bezier(0.4, 0, 1, 1)` | Anything leaving |

Rules:
- Only `opacity` and `transform` are animated, plus `clip-path` for the slider and `width` for progress bars. Never animate layout properties on lists.
- Enter: `opacity 0 → 1` plus `translateY(4px) → 0`. Never slide in from off-screen, except sheets, which enter from the right or from the bottom on mobile.
- **No page-transition animations.** Route changes are instant; perceived speed matters more.
- There is **at most one signature animation per page view**, and it runs once, not on every re-render (guard with a `useRef`).
- `@media (prefers-reduced-motion: reduce)`: all durations go to 0ms and signature sequences render their final
  state immediately. Implement this as a global CSS rule plus a `useReducedMotion()` hook (a small `matchMedia` hook in `lib/utils.ts`) for the JS sequences.
- Implement everything with CSS transitions and keyframes and `tw-animate-css` (already installed). **Do not add
  framer-motion or motion.** Nothing here needs it.

---

## 6. App shell and navigation

### 6.1 Top bar (all app routes, but **not** on `/` (landing), `/verify/*` or `/story/*`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ▣ Overlook   Overview  Upload  Search  Review ⁽⁴⁾        [⌕ Search evidence…   ]   ◐  │  56px
├──────────────────────────────────────────────────────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  2px analysis line
```

- Height is 56px. It is sticky at `top:0` with `--bg` at 92% opacity (no blur) and a 1px `--line` bottom border.
- **Wordmark:** a 14px square mark (1.5px `--fg` stroke with a 4px filled inner square, drawn in inline SVG; it reads
  as a "sealed" frame) followed by "Overlook" in Display 16/650, tracking −0.01em. It links to `/dashboard`.
- **Nav items:** Sans 14/500 in `--fg-2`, with 12px horizontal padding. The active item is `--fg` with a 2px `--fg`
  underline flush to the bar's bottom border. Hover changes the colour to `--fg` in 120ms. Active state uses
  `usePathname()`. **Overview** points at `/dashboard`, and `/projects/*` and `/assets/*` also highlight it.
- **Review count:** a `text-micro` count in a 4px-radius chip (`--review-tint` background, `--review` text) that
  shows `stats.awaitingReview`. It is hidden when the count is 0.
- **Search field:** 280px wide, 32px tall. It is a real `<form action="/search" method="get">` with `name="q"`, so no
  JS is needed. The `/` key focuses it (it is ignored while typing in an input). It is hidden below `md`; the nav
  "Search" item covers that case.
- **Theme toggle:** an icon button (`Moon`/`Sun`) that sets `class="dark"` or `"light"` on `<html>`, persisted in
  `localStorage["overlook-theme"]`. With no stored value, follow `prefers-color-scheme`, and default to dark if
  unknown. An inline `<script>` in `layout.tsx` sets the class before paint to avoid a theme flash.
- **Analysis line (2px):** it shows only when `pending + analyzing > 0`. The track is `--line` and the fill is
  `--accent`, at a width of `done / total`. The data comes from `getCounts()` in the root layout (a server
  component), so there is no polling here. It never triggers analysis; it only reflects the count.
  Tooltip on hover: "12 of 40 analyzed · go to Upload".
- **Mobile (< md):** wordmark, spacer, Review chip, then a menu button. The menu opens a right sheet containing the
  nav items stacked at 48px each, the search field, and the theme toggle.

The shell file is `components/AppShell.tsx` (the top bar) and is rendered from `app/layout.tsx`. Public routes
render without it: use a route group `app/(public)/verify` and `app/(public)/story` with their own layout, **or**
check the pathname in the shell. Prefer route groups; URLs do not change.

### 6.2 Page header pattern (every app page)

```
── 03 · PROJECT                                   (eyebrow, optional breadcrumb)
Kalindi Kunj ghat cleanup                          text-h1
cleanup · 3 Aug → 14 Sep 2026 · 500 m geofence · 28.5412, 77.3013    text-data --fg-2
                                                   [secondary] [primary]   ← actions right-aligned, same baseline
─────────────────────────────────────────────────── 1px --line, 32px below
```

The breadcrumb, when present, sits above the eyebrow: `← Overview` in `text-small --fg-2`, with hover `--fg`.

**Landing-style header (as built).** Every app page header follows the landing hero: the eyebrow on a highlighter
mark, a big light title (`text-hero`, `clamp(36px, 4.8vw, 64px)`, weight 300, the key noun at 600), then a one-line
**lede** (18px, `--fg-2`, 50ch) that is a live sentence built from data the page already loads, then the mono meta
line. Pages whose title is a user-entered name or a long sentence (project, photo, receipt) use `size="md"`
(`text-hero-md`, up to 44px). On empty states the header takes an `aside` (a sample contact sheet, see 8.1) and the
actions move under the lede. Section headings rise in gently on scroll (`.reveal`, CSS scroll-driven animation, headings
only, never content).

### 6.3 Section pattern

Every major block is a `<section aria-labelledby>` with a numbered eyebrow and a `text-h2`. On desktop, sections are
separated by `space-2xl` and a hairline. There are no boxes around whole sections; boxes are for panels inside them.

---

## 7. Component library

All components live in `components/` (presentational only) or `components/ui/` (primitives). Existing component
names are kept so imports do not churn. Every interactive component has the states: default, hover, focus-visible,
active, disabled, and loading where relevant.

**Global focus style:** `outline: 2px solid var(--accent); outline-offset: 2px;` on `:focus-visible` only. Never remove it.

### 7.1 Button (`components/ui/button.tsx`, restyle the variants)

| Variant | Default | Hover | Active | Disabled | Use |
|---|---|---|---|---|---|
| `default` (primary) | `--fg` bg, `--bg` text | bg mixes 88% `--fg` | `translateY(1px)` | 40% opacity, no pointer | One per view: "Analyze 12 pending", "Generate donor PDF" |
| `outline` (secondary) | transparent, 1px `--line-strong`, `--fg` text | `--surface-2` bg | `--surface-3` | 40% | Most actions |
| `ghost` | transparent, `--fg-2` | `--surface-2`, `--fg` | `--surface-3` | 40% | Toolbars, "Undo" |
| `approve` | 1px `--verified`, `--verified` text | `--verified-tint` bg | none | 40% | Review: Approve |
| `reject` | 1px `--suspicious`, `--suspicious` text | `--suspicious-tint` bg | none | 40% | Review: Reject |
| `link` | `--accent` text, 1px underline at 3px offset in `--accent`/40% | underline at 100% | none | none | Provenance links |

Sizes: `sm` 28px (12px text), `default` 32px (14px), `lg` 40px (14px, 16px x-padding; the primary CTA on empty states).
**Loading:** a 14px spinner (a 1.5px ring rotating in 700ms linear, allowed under reduced motion as a static ring)
replaces the leading icon. The label changes to the progressive form ("Analyzing…", "Building PDF…"), the width is
locked to avoid layout shift (`min-width` set from the initial render), and the button gets `aria-busy="true"`.
**Keyboard hints:** buttons with shortcuts show a `<kbd>` (text-micro, 1px `--line-strong`, radius-sm, 18px tall)
right-aligned inside the button, for example `Approve [A]`.

### 7.2 Inputs

- Text, number, and date inputs: 36px tall, `--surface-2` background, 1px `--line-strong`, radius-sm, 12px x-padding, 14px text,
  placeholder in `--fg-3`. Hover sets the border to `--fg-3`; focus uses the accent outline (§7). Invalid: `aria-invalid` makes the border `--suspicious`
  and adds a message below (`text-small --suspicious`, with an icon).
- Labels: `text-eyebrow` above the field with a 6px gap. They are **always visible**; placeholders never act as labels.
- Select: a **native `<select>`** styled like the input with a custom chevron (a background SVG). Native selects are kept because the
  search page is a GET form that must work without JS, and they are accessible by default.
- Checkbox: a 16px square, radius 3px, 1px `--line-strong`. Checked is `--fg` fill with a `--bg` check.
- Search hero input (on `/search`): 52px tall, 17px text, leading `Search` icon, trailing submit button `Search ↵`.

### 7.3 TrustBadge (`components/TrustBadge.tsx`, redesigned)

This is the most important atom. It **always shows three signals**: a mark shape, the band label, and the score.

```
[■✓ Verified · 92]      [■– Needs review · 65]      [■✕ Suspicious · 35]      [○ Not scored]
```

- The container is 22px tall, radius-sm, `--{band}-tint` background, with `--{band}` text and mark, padding 0 8px 0 4px, and a 6px gap.
- **Mark:** a 14px square in the band colour with a 10px glyph in the tint colour (`Check`, `Minus`, `X`). The shapes
  differ as well as the colours, so the badge still works for colour-blind users and in greyscale print.
- The label uses Sans 12/500 and the score uses Mono 12/500 `tabular-nums`, separated by a middle dot in 50% opacity.
- Review suffix: `· approved` or `· rejected` in `--fg-2`. "Rejected" uses strikethrough on the score. "Approved"
  shows a small `UserCheck` icon, because a human has overridden the number.
- "Not scored": transparent background, a 1px dashed `--line-strong` border, `--fg-3` text, and a hollow circle mark.
- The `lg` size (used on the asset page and verify rows) is 28px tall, 14px text, with an 18px mark.
- `aria-label`: "Trust: Needs review, score 65 of 100, approved by reviewer".

### 7.4 TrustMeter (new, presentational)

A horizontal 0–100 bar for the asset page and the review cards.

```
0 ─────────────────────────|50───────────────|80──────────── 100
  suspicious                  needs review      verified
██████████████████████████████████████▌                           ← fill to score in band colour
                                      65
```

- The track is 6px tall on `--surface-3`, with tick marks at 50 and 80 (1px, 10px tall, `--line-strong`) and tick labels in `text-micro --fg-3`.
- The fill uses the band colour. A 1px `--fg` marker line sits at the score, with the score in `text-data` above it.
- If NO_METADATA capped the score, draw a dashed vertical line at 60 labelled `cap 60`, so the cap is visible.
- `role="meter" aria-valuemin=0 aria-valuemax=100 aria-valuenow={score} aria-valuetext="65, needs review"`.

### 7.5 AuditTrace (new; the "show the math" component, see §9.1)

A ledger of how the score was reached. It is built purely from `trust_flags` plus the deduction constants (§14.2).

```
  Starting score                                            100
  − Photo of a screen or print          PHOTO_OF_PHOTO      −35
  − Outside the site geofence           OUTSIDE_GEOFENCE    −25
    1,812 m from centre · geofence 500 m  ↗ see on map
  ─────────────────────────────────────────────────────────────
  Trust score                                                40   [■✕ Suspicious · 40]
  i  No location/time metadata: capped at 60 (not applied: already below)
```

- Rows are 36px with a 1px `--line` divider, a label in `text-body`, the flag code in `text-data --fg-3` (hidden below `sm`), and the deduction in `text-data`, right-aligned and `tabular-nums`.
- Deduction colour follows severity: high is `--suspicious`, warning is `--review`, and info has no number and appears as a neutral note row with an `Info` icon.
- **Evidence line** under a row (`text-small --fg-2`): the fields come from `flag.evidence`.
  - `matchAssetId` gives a link, "Matches an earlier upload ↗", and a 40px thumbnail when available.
  - `hammingDistance` renders as "perceptual distance 3".
  - `distanceM` and `radiusM` render as "1,812 m from centre · geofence 500 m".
  - Other evidence keys render as `key: value` in mono.
- The total row is a 2px `--fg` rule above, "Trust score" in `text-title`, the total in `text-data-xl` at 28px, and a TrustBadge.
- NO_METADATA cap: when `has_exif=false`, render a cap row: "Capped at 60: no location/time metadata. This makes
  the photo unverifiable, not fake." Display whether the cap changed the number.
- With zero flags, render one row, "No checks failed · 100", plus the cap row if one applies.

### 7.6 FlagRow (used in review cards and compact contexts)

It has an icon (from §4.8), a human title, the reason text, and the deduction chip, laid out as
`[icon] Outside the site geofence   −25`, with `reason` below in `text-small --fg-2`.

Human titles, mapped from the flag code (keep them in one map in `components/flag-copy.ts`):

| Code | Title |
|---|---|
| `DUPLICATE_EXACT` | Same file uploaded before |
| `DUPLICATE_REUSED` | Near-identical to an earlier photo |
| `PHOTO_OF_PHOTO` | Looks like a photo of a screen or print |
| `OUTSIDE_GEOFENCE` | Taken outside the site |
| `OUTSIDE_TIMEFRAME` | Taken outside the project dates |
| `IRRELEVANT` | Doesn't look like field work |
| `NO_METADATA` | No location or time metadata |
| `LOW_CONFIDENCE` | Couldn't classify confidently |

`reason` strings come from `lib/trust.ts` unchanged. Titles are UI-only.

### 7.7 EvidenceTile (thumbnail card; replaces the ad-hoc `<li>` grids)

```
┌──────────────────────┐
│                      │  1:1 photo, radius 0
│   [photo]            │
│                  0:45│  ← timecode chip (video frames) bottom-right, scrim
└──────────────────────┘
[■– Needs review · 65]      ← TrustBadge
Pile of plastic waste beside a road…   ← caption, text-small, 2-line clamp
⌖ GPS  ◷ 12 Aug 2026, 09:14            ← MetaLine, text-data --fg-3
```

- The whole tile is one link to `/assets/[id]`, with the focus ring on the tile. Hover lifts the image to
  `scale(1.02)` inside an `overflow:hidden` frame (200ms) and moves the caption colour from `--fg-2` to `--fg`.
- Variants:
  - `default` (grid);
  - `compact` (96px, no caption; used in the timeline and the picker);
  - `selectable` (a checkbox at top-left over the scrim; selected shows a 2px `--accent` inset outline and an `--accent-tint` caption area);
  - `match` (search: a `87% match` chip at top-left on the scrim);
  - `pending` (a shimmer line; see below).
- Status overlays sit on the image, top-left, as a `text-micro` scrim chip:
  - `PENDING` is static;
  - `ANALYZING` has a 1px `--accent` line sweeping top to bottom in 1.4s linear infinite (off under reduced motion);
  - `FAILED` uses `--suspicious` text;
  - `VIDEO` has a Film icon;
  - `FRAME 0:45` marks a key frame.
- MetaLine: `MapPin` + "GPS" / `MapPinOff` + "No GPS", and `Clock` + the time or `ClockAlert` + "No time".
  "No metadata" (both missing) shows a single neutral chip, `NO METADATA`.

### 7.8 StatFigure ("receipt number")

A big number that proves itself.

```
── VERIFIED
31 / 40                       text-data-xl, "/ 40" in --fg-3
78% trust 80+ or approved     text-small --fg-2
View 31 photos →              link --accent (the receipt)
```

- The whole block is a link when a destination exists. Hover moves the arrow `translateX(2px)` and underlines the receipt link.
- **Denominators are always shown when they exist** (OWID principle): "31 / 40", not "31".
- Empty value: the text `n/a` (the `NA` constant in `lib/copy.ts`) in `--fg-3`, with a helper line explaining why ("appears after analysis").

### 7.9 ScorecardTable (`components/Scorecard.tsx`, redesigned)

```
── 01 · IMPACT SCORECARD
 40 photos    36 analyzed     Coverage 78%      Avg trust 81       9 need review
 (StatFigure ×5 in a row, each a receipt link)

 BEFORE ≤ 12 Aug · 14 photos    ·    AFTER ≥ 19 Aug · 22 photos    ·    7-day gap
 ───────────────────────────────────────────────────────────────────────────────
 SIGNAL                BEFORE           AFTER            CHANGE        ALL
 Garbage visible       18/20 ▇▇▇▇▇▇▇▇▇  2/22 ▏            −81 pts       20/42
 Dense vegetation       3/15 ▇▇         12/15 ▇▇▇▇▇▇▇▇     +60 pts       15/30
 …
 x/y = photos showing the signal / analyzed photos in that set. Click any number to see those photos.
```

- The five StatFigures come from `sc.photos`, `sc.analyzed`, `sc.verifiedPct`, `sc.avgTrust`, and `sc.flaggedOrUnscored`, with the same hrefs as today.
- The phase line comes from `sc.phases`. If it is null, show a neutral note: "Before/after columns appear once photos span a gap of 3 or more days."
- Table: the header uses `text-eyebrow`, rows are 44px, and cells use `text-data tabular-nums`.
  - **Both numbers in a fraction stay separate links**, as today: `hits` goes to `part=hits` and `total` goes to `part=total`.
  - **Mini bar:** 64 × 4px, `--line-strong` for before and `--fg` for after, filled to hits/total. It is purely visual
    (`aria-hidden`) because the fraction is the accessible value.
  - **Change column:** the difference of the percentages (`after% − before%`) as signed points in mono. It is
    computed in the component from the existing cells, not from new logic. There is no colour: whether a change is
    good depends on the signal (less garbage is good, more vegetation is good), so show the sign and an arrow glyph
    (`↓`/`↑`) only. The column is hidden when the phases are null.
- Hovering a row sets its background to `--surface-2`. The receipt hover preview is an **optional nice-to-have**: a
  popover with up to 6 thumbnails of the photos behind the number. It needs thumbnails in the payload, so skip it if
  that means new queries.

### 7.10 BeforeAfterSlider (`components/BeforeAfterSlider.tsx`, redesigned)

- The frame is 4:3, radius 0, `max-width: 100%`. Images are cropped identically (the existing `slideUrl`).
- Divider: a 1px white line with a 2px `rgb(0 0 0 / .35)` shadow on each side for contrast. The handle is a 32px
  square (radius-sm) in `--fg` with a `--bg` `ChevronsLeftRight` icon, vertically centred.
- **Interaction:** drag anywhere on the image (pointer events with `setPointerCapture`), or click to jump. The handle is a real
  `role="slider"` element: `aria-valuemin=0 max=100 now=pos`, `aria-label="Before and after comparison"`,
  `aria-valuetext="45% before"`. Keys: ←/→ ±5, Shift+←/→ ±20, Home/End to 0/100.
  **Remove the separate `<input type=range>`**, because the handle is now the control.
- Corner labels: `BEFORE · 12 AUG 2026` top-left and `AFTER · 19 SEP 2026` top-right, as `text-micro` scrim chips.
- Intro hint (the signature moment on the project page, §9.3): on the first time it enters the viewport, the divider
  eases 50 → 35 → 50 over 900ms. This happens once per page view and is skipped under reduced motion.
- Below the slider is the **PairMeta** line: `7 days apart · 12 m apart · pHash n/a` in `text-data --fg-3`, then the
  change summary in `text-body` (max 68ch). If there is no summary yet, show "Summary not written yet." in `--fg-3` italic.
- Touch: `touch-action: pan-y` on the frame, so vertical scrolling still works on phones.

### 7.11 ProjectMap (`components/ProjectMap.tsx`, restyled; still react-leaflet + OSM)

- The frame is 1px `--line`, radius 0, 420px tall on desktop and 300px on mobile.
- **Tiles stay OpenStreetMap** (per CLAUDE.md). They are desaturated with a CSS filter on `.leaflet-tile-pane`:
  - light: `filter: grayscale(1) contrast(.92) brightness(1.04)`;
  - dark: `filter: grayscale(1) invert(1) contrast(.85) brightness(.9)`.

  This gives a calm base, so only our pins carry colour.
- Geofence: a `Circle` with a `--accent` stroke, weight 1.5, `dashArray "4 4"`, and a 6% accent fill.
  Leaflet needs literal colours, so read them from CSS variables at mount with `getComputedStyle`.
- Pins: a `CircleMarker` with radius 6, a 2px stroke in `--bg` (a halo) and a fill in `--verified` (inside) or
  `--suspicious` (outside). Pins with no geofence verdict use `--fg-2`.
- Centre: a 10px crosshair (two 1px `--fg` lines), non-interactive.
- Popup: restyled to a level-2 surface, 200px wide, containing a 1:1 thumbnail, the `text-data` time, an
  inside/outside line with an icon, and "Open photo →".
- Legend (below the map, not inside it): `● Inside geofence (n)  ● Outside (n)  ◌ Geofence 500 m`.
- **Accessible alternative:** a "List view" toggle under the map renders the same points as a table (time, distance
  from centre, inside/outside, link). Maps are not keyboard-friendly, and the list is the accessible equivalent.
- Leaflet zoom controls are restyled as 28px square outline buttons in `--surface-1`. Attribution stays visible, using `text-micro`.

### 7.12 TimelineStrip (`components/Timeline.tsx`, restyled)

- A horizontal scroll with `scroll-snap-type: x proximity`, one column per day.
- Each column has a header of eyebrow date and count (`12 AUG · 6`), then a 2-row grid of 56px compact tiles (radius 0).
- A 1px `--line` baseline runs through the column headers with a 5px dot per day, like a time axis.
- If the gap between consecutive days is more than 2 days, insert a 24px "gap" column with a dashed axis and a `text-micro` label (`+7 d`).
  Because the scorecard splits phases at the largest gap, this makes the before/after split visible.
- An `approx` item (no photo time, so upload time was used) gets a dashed 1px `--line-strong` outline and the tooltip "No photo time: upload time used".
- Scroll affordance: 24px fade masks at the left and right edges, shown only when scrollable. Buttons ‹ › appear on hover (desktop).

### 7.13 HashBlock

It displays a SHA-256 value (64 hex characters) readably.

- Mono 13/20, grouped into 8 blocks of 8 characters separated by a thin space, wrapping at block boundaries.
- A label row sits above: `RECORDED` / `RECOMPUTED` (eyebrow).
- On the verify page the two hashes are stacked and aligned. Matching blocks are `--fg`. On a mismatch, differing
  characters are shown in `--suspicious` with an underline.
- It has a copy button (ghost icon, `Copy` → `Check` for 1.5s) with `aria-label="Copy SHA-256"`.

### 7.14 VerifySeal (verify page hero)

This is a large status block, not a coloured banner.

```
┌────────────────────────────────────────────────────────────────┐
│  ⌗  REPORT INTEGRITY · SHA-256                                 │
│                                                                │
│  Report unchanged                     (text-h1, 300 + 600)     │
│  The data behind this report hashes to the value recorded      │
│  when it was generated on 14 Sep 2026.                         │
│                                                                │
│  RECORDED     3f9a1c02 7be41d9a …                              │
│  RECOMPUTED   3f9a1c02 7be41d9a …        [✓ match]             │
└────────────────────────────────────────────────────────────────┘
```

- It sits on a `--surface-1` panel with a **4px left rule** in `--verified` (match) or `--suspicious` (mismatch). Everything else stays neutral, because the seal should look like a document, not an alert.
- It has `role="status"` and announces its final text immediately, independent of the animation.

### 7.15 ProgressLedger (`components/AnalysisPanel.tsx`, redesigned)

```
── ANALYSIS
12 / 40 analyzed                                   ← text-data-xl
▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░         ← segmented bar
■ 12 done   ■ 2 failed   □ 26 pending              ← legend, text-data
[Analyze 26 pending]  [Retry failed / stuck]       ← primary + outline
Cached: nothing is ever analyzed twice. ~650 AI Vision units per new photo.   ← text-small --fg-3
```

- Segmented bar, 8px tall: done is `--fg`, failed is `--suspicious`, analyzing is `--accent` with the shimmer, and pending is the `--surface-3` track. Widths animate over 200ms.
- While running, the primary button becomes `Stop after current batch` (outline). A live line reads "Analyzing 2 photos…" (`aria-live="polite"`).
- The rate-limit note becomes a neutral inline notice with a countdown: `Rate limited · retrying in 23 s` (the existing 30s wait, shown as a countdown).
- Errors are a collapsible list, "2 failed", each row showing `public_id` in mono plus the error, and a link to the asset.
- Keep all existing logic, including the loop, stop ref, and retry route. Only the markup and styles change.

### 7.16 Dropzone and UploadQueue (`components/Uploader.tsx`, redesigned)

Dropzone:

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
   ⇪  Drop field photos and videos here, or  [Choose files]
      JPG · PNG · WEBP · HEIC up to 15 MB   MP4 · MOV · WEBM up to 100 MB
      Location and time are read from each file before it leaves your device.
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- Border: 1px dashed `--line-strong`, radius-md, 160px minimum height, `--surface-1` background.
- Drag-over: the border turns solid `--accent`, the background becomes `--accent-tint`, and the text changes to "Release to upload 12 files".
- **Drag-and-drop** calls the existing `handleFiles(files)`. It is the same code path as the file input, so no logic changes.
  The whole zone is a `<button>`-like `label` for the hidden input, so it is keyboard-accessible (Enter/Space opens the picker).

UploadQueue (below the zone while a batch is running), one 40px row per file:

| Column | Content |
|---|---|
| State icon | queued is a hollow circle; uploading is a spinner; done is `Check` in `--verified`; rejected or failed is `X` in `--suspicious` |
| Name | `text-data`, with middle-ellipsis truncation (`IMG_2041…_edit.jpg`) and the full name in `title` |
| Metadata read | once EXIF is read: `⌖ GPS ◷ time` or `No metadata` (neutral). The value comes from `readExif` via a small state addition; no logic change. |
| Note | the rejection reason (`too large (18.2 MB; max 15 MB)`) in `--suspicious` `text-small` |

A summary line appears above the rows: `8 uploaded · 1 rejected · 1 failed`. The queue collapses to that summary 4s after the batch finishes.

### 7.17 ReviewCard (`/review` item)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐  evidence/inbox/img_2041          [■✕ Suspicious · 25]  │
│ │              │  ───────────────────────────────────────────────────────  │
│ │  [photo]     │  ⧉  Near-identical to an earlier photo              −40   │
│ │   240×240    │     perceptual distance 3 · ↗ earlier upload [thumb]      │
│ │              │  ⌖̸ Taken outside the site                          −25   │
│ └──────────────┘     1,812 m from centre · geofence 500 m                  │
│  Kalindi Kunj (demo) · 12 Aug 2026                                         │
│                     [✓ Approve  A]  [✕ Reject  R]      Open details →      │
└───────────────────────────────────────────────────────────────────────────┘
```

- The panel is `--surface-1` with 1px `--line`, radius-md, and 16px padding (24px on desktop).
- **Selected (keyboard cursor):** a 2px `--accent` left rule plus `--surface-2` background.
- On approve or reject, the card collapses: height and opacity go to 0 over 200ms. It then moves to the "Reviewed" list and focus moves to the next card.
  **Undo** is available for 6 seconds through an inline strip that replaces the card ("Approved img_2041 · Undo"), and later from the Reviewed list.
- Reviewed items render compact (a 64px thumbnail, the badge with the review suffix, and an Undo ghost button).

### 7.18 Other primitives

| Component | Spec |
|---|---|
| `Panel` | `--surface-1`, 1px `--line`, radius-md, padding 16 or 24. Optional header row (eyebrow and actions) separated by a hairline. |
| `Chip` / `Tag` | 22px tall, radius-sm, 1px `--line-strong`, `text-data` 12px. Tags render with spaces: `cleanup drive`. Links go to `/search?tag=…` (the search page already supports this). |
| `KeyValue` | A definition list in two columns (eyebrow key 140px, value `text-data` or `text-body`), 32px rows with hairlines. Used for Details and Source. |
| `StatusDot` | An 8px circle: pending is hollow `--fg-3`; analyzing is `--accent` with a 1.6s opacity pulse; done is `--fg`; failed is `--suspicious`. Always paired with a text label. |
| `CopyButton` | A ghost icon button showing `Copy`, then `Check` for 1.5s. It announces "Copied" through a visually hidden `aria-live` region. |
| `Sheet` | Right side, 480px (full width on mobile, from the bottom at 90vh), level 2, with a header (title plus close) and a 24px body. Used for "Create project" and "Add photos". Use shadcn `sheet` (base-ui). |
| `Tooltip` | Level 2, `text-small`, 6px × 8px padding, 300ms delay. Never the only place information lives. |
| `InlineNotice` | For operation results (replacing the plain `note` strings). It has an icon, text, and optional action, with a 3px left rule: neutral `--line-strong`, success `--verified`, error `--suspicious`. It has `role="status"`, or `role="alert"` for errors. |
| `Skeleton` | A `--surface-3` block with an opacity pulse (.6 ↔ 1, 1.4s). Photos use a skeleton at a fixed aspect ratio to avoid layout shift. |
| `EmptyState` | A 20px icon in `--fg-3`, a `text-title`, one `text-small` line, and one action. Left-aligned, never centred in a giant void. |
| `Kbd` | See §7.1. |
| `SectionNav` | Sticky under the top bar on the project page (§8.3): a horizontal list of anchors with scroll-spy (IntersectionObserver). The active item gets a 2px underline. It scrolls horizontally on mobile. |

### 7.19 CustodyFunnel (dashboard section 01)

It replaces the five stat tiles and the distribution bar with one object that tells the chain of custody left to right.

```
UPLOADED        →  ANALYZED        →  SCORED                →  VERIFIED          │ Flagged for review   6
44                 40                 40                       31 / 40           │ Sealed reports       2
████████████████   ██████████████▌    ███████████▏▇▇▇ ▇▇       ███████████▏      │ Public stories       1
42 photos·2 videos 4 waiting·0 failed 31 · 5 · 4 by band       trust 80+ or approved
```

- There are four stages in a 4-column grid with hairline dividers. A `→` glyph (mono, `--fg-3`) sits on each divider.
- Each stage has an eyebrow, a `text-data-xl` number, an 8px bar whose width is `n / uploaded`, and a mono drop-off line.
- **Bar colours tell the develop story:**
  - Uploaded is `--accent` (cyanotype blue: not proven);
  - Analyzed is `--fg` (ink);
  - Scored is **segmented by band** (verified, review, and suspicious widths);
  - Verified is `--verified`.
- Links:
  - Uploaded and Analyzed → `/upload`;
  - Scored → `/review`;
  - Verified → `/search?band=Verified`.

  These are the same destinations as today's stats.
- The right rail is a 3-column span of hairline rows: Flagged for review (number in `--review`, linked to `/review`), sealed reports, and public stories.
- All numbers come from `computeStats` and the already-fetched `trust_score` values. The band counts exclude rejected assets.
- Below the funnel, a legend states the meaning: "Blue = uploaded, not yet verified · Verified 31 · Needs review 5 · Suspicious 4".

### 7.20 ContactSheet

This is the framing described in §4.9. Props: `edgeTop: [left, right]`, `edgeBottom: [left, right]`,
`frames: {href, src, number, state: "developed" | "pending" | "flagged", label?}[]`, and `columns` (8 on desktop,
4 on mobile). Each frame is an EvidenceTile in `compact` mode, with the develop and crop-mark behaviour.

---

## 8. Page specs

Every route that exists today is listed here, plus the landing page (§8.0, the one scope exception). No other routes. The section numbers in eyebrows are fixed per page.

### 8.0 `/` Landing page: `app/page.tsx` (new, public, no app top bar)

**Purpose:** in one scroll, a judge or a funder *watches the concept get proven* on a single photo, then presses one
button and lands in the working dashboard. It is a proof, not a brochure: every claim on it is a feature in the app.

**Page order**

```
[Landing header: ▣ Overlook   How it works · The brief · Verify a report        [Open the ledger →]]   sticky, 60px

HERO (12-col; copy 6, contact sheet 6)                                     ← not 100vh; sized to content
── EVIDENCE PLATFORM FOR FIELD PROJECTS
Every field photo is a claim.            ┌ ROLL 01 · YAMUNA GHAT ──── 12 FRAMES ┐
Overlook checks it.                      │ [f][f][f][f]   frames start blue       │
(display 300, "claim." and "checks"      │ [f][f][f][f]   and develop one by one; │
 at 650; "checks" in --accent)           │ [f][f][f][f]   3 stay blue + flagged   │
lede (18/28, 50ch)                       └ BLUE = NOT YET VERIFIED ── 12/12 CHECKED · 3 FLAGGED ┘
[Open the ledger →]  [Watch a photo get checked ↓]

PROOF LINE (4 true facts, mono figures, hairline grid)
8 trust checks per photo · 64-bit perceptual hash · 0 AI calls ever repeated · SHA-256 seal on every report

STORY (scrollytelling; §9.4). Intro: "Follow one photo. It looks fine. It isn't."
 left: 5 steps (each ~92vh)                right: sticky stage (7 cols)
 01 CAPTURE  Read where and when           photo + crosshair + EXIF readout typing in
 02 ANALYZE  See what's in it              tags, 6 signals, caption typing
 03 CHECK    Catch the photo that's lying  pHash bits compare (3 differ) → −40; pin leaves geofence → −25; 100→60→35
 04 MEASURE  Numbers you can click         before/after slider scrubbed by scroll; after-counts count down
 05 PROVE    Seal it. Anyone can check it  (ground turns cyanotype) report sheet + QR; hash recomputes; seal ring draws

THE BRIEF: "Everything the brief asks for, working."  10-row ledger: requirement | what Overlook does | See it →

CTA BAND (--cy ground): "Open the ledger."  live numbers line  [Open the ledger →] [Verify a sealed report]
FOOTER (mono): Overlook · Code Cubicle 6.0 · Problem statement 02 | Cloudinary · Supabase · Gemini
```

**Content rules**
- **Hero copy** is fixed:
  - H1: "Every field photo is a **claim.** Overlook **checks** it."
  - Lede: "NGOs, CSR teams and government field projects upload photos and video. Overlook reads where and when each one was taken, sees what is in it, scores how far to trust it, and seals the report so anyone can verify it by scanning a QR code."
- **Proof line:** only facts that are true of the code: 8 flag codes in `lib/trust.ts`, the 64-bit pHash, the cache-first analysis, and the SHA-256 manifest. **No invented metrics** (no "10,000 NGOs", no testimonials, no logos).
- **The brief ledger:** the 10 rows of the PS mapping in README.md. The "See it" links go to real routes: `/dashboard`, `/review`, `/search`, a demo project, and the latest `/verify/[id]`, if one exists.
- **CTA numbers** are **live**. The page is a server component that calls `computeStats` with the same light query as the layout: "44 files. 31 verified, 6 flagged for review, 2 sealed reports." If the workspace is empty, the line becomes "An empty workspace, ready for your first upload."
- **Story photos.** Use the user's own demo photos, not stock. Put 4 JPGs in `public/landing/` (never in Cloudinary, so the landing page costs no quota):
  - `suspect.jpg`, the reused and off-site photo (faces pixelated before saving);
  - `before.jpg` and `after.jpg`, a real pair from the cleanup drive;
  - `screen.jpg`, which can be `scripts/demo-assets/screen-photo.jpg`.

  The hero contact sheet uses 12 small crops of demo photos from the same folder (`sheet-01.jpg` … `sheet-12.jpg`, 240×180).
- **Story values** (coordinates, distance 1,812 m, pHash distance 3, scores 100 → 60 → 35, scorecard fractions) are a **fixed illustrative case**, written as constants in `components/landing/story-data.ts`. The stage shows a small `ILLUSTRATIVE CASE` micro-label, so nobody mistakes it for live data.
- **pHash visual.** Two 8×8 bit grids (64 cells; filled = 1). The 3 differing bits get a `--suspicious` outline. Label: "Distance 3 · ≤ 6 means near-identical". This shows the real mechanism (Hamming distance of 64-bit hashes). **Do not** draw boxes on objects in the photo: the AI returns no bounding boxes, and the landing page must not imply that it does.

**Layout and responsive**
- Desktop (≥ 900px): the steps sit in columns 1–5, and the stage in columns 7–12 is `position: sticky; top: 76px; height: calc(100vh - 100px)`, centring its content.
- Mobile (< 900px): the stage becomes a sticky strip under the header, at most about 48vh, with a `--bg` background and a bottom hairline. It shows only the photo, its chips, and the score strip; the readout and check panels are hidden. Each step's own `facts` list carries the same data as text. Steps are `min-height: 78vh` and always fully opaque.
- The hero stacks (copy, then the contact sheet) below 1024px. The contact sheet stays 4 columns.

**Components** (all under `components/landing/`, presentational + one client controller)

| Component | Notes |
|---|---|
| `LandingHeader` | Sticky; the nav anchors scroll smoothly (instantly under reduced motion). The CTA is `Link href="/dashboard"`. |
| `HeroContactSheet` | Client component: runs the develop sequence once on mount (§9.4). |
| `ProofLine` | Static server component. |
| `StoryScroller` | Client component. It owns the scroll progress and passes `(chapter, progress)` to the stage. It uses `IntersectionObserver` to know when the story is on screen, plus one `requestAnimationFrame`-throttled scroll listener while it is. **No scroll libraries** (no GSAP, no Lenis, no framer-motion). |
| `StoryStage` | Pure function of `(chapter, progress)`, so scrolling back up replays correctly. It has three scenes, cross-faded over 350ms: Photo (chapters 1–3), BeforeAfter (4), and Report (5). |
| `PhashGrid` | Renders 64 cells from a bit array; `revealRows` prop. |
| `BriefLedger` | Static table. |
| `CtaBand` | Server component with live stats. |

---

### 8.1 `/dashboard` Overview (dashboard): `app/dashboard/page.tsx` (moved from `app/page.tsx`)

> Moving the route: `git mv app/page.tsx app/dashboard/page.tsx`, then update every link that meant "dashboard":
> `app/not-found.tsx`, `app/search/page.tsx`, `app/review/page.tsx`, and `app/projects/[id]/page.tsx` (breadcrumbs),
> plus the README walk-through. `scripts/check-demo-flow.ts` must still pass; update any URL it opens.
>
> **Section 01 is now the CustodyFunnel (§7.19)**, replacing the stat tiles and distribution bar in the sketch below.
> After section 02, add **"Latest evidence"**: a ContactSheet (§7.20) of the 16 newest assets that shows develop state
> and crop marks, with the edge print `UPLOAD BATCH · <date of newest>` and the link "All uploads →" (`/upload`).


**Purpose:** in 5 seconds, show that the evidence system works on *this* workspace: how much came in, how much is
verified, what was flagged, and where it happened. It is the proof of concept, not a marketing page.

```
── WORKSPACE
Evidence ledger                                             [Upload evidence]  ← primary
─────────────────────────────────────────────────────────────────────────────
── 01 · AT A GLANCE
┌───────────┬────────────┬────────────┬────────────┬────────────┐
│ 42 + 2    │ 40 / 44    │ 31 / 40    │ 6          │ 3 · 1      │  StatFigure ×5
│ photos,   │ analyzed   │ verified   │ flagged    │ reports ·  │
│ videos    │ 4 pending  │ trust 80+  │ for review │ stories    │
│ +16 frames│            │ or approved│ Review →   │            │
└───────────┴────────────┴────────────┴────────────┴────────────┘
TRUST DISTRIBUTION  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇ ▇▇▇▇▇▇▇ ▇▇▇▇ ░░
                    ■ Verified 31  ■ Needs review 5  ■ Suspicious 4  □ Not scored 4

── 02 · FLAGGED FOR REVIEW                                      View queue (6) →
[ReviewCard compact ×3, horizontal on desktop: thumb + badge + first flag title]

── 03 · PROJECTS (2)                                      [New project]  ← outline, opens Sheet
 NAME                          ACTIVITY     PHOTOS   AVG TRUST   DATES
 Kalindi Kunj ghat cleanup     cleanup        28       [81]      3 Aug → 14 Sep 2026   →
 …

── 04 · SUGGESTED PROJECTS (1)
┌ Suggested: 34 photos near 28.5412, 77.3013 · 3 Aug – 14 Sep 2026 ─────────────────┐
│ [thumb][thumb][thumb][thumb][thumb] +29       radius ≈ 180 m    [Review & create] │
└──────────────────────────────────────────────────────────────────────────────────┘
7 unassigned photos can't be grouped automatically (no GPS, or too few nearby). Assign them from a project page.
```

- **01 At a glance:** five StatFigures mapped exactly to the current `stats` links:
  1. photos and videos → `/upload`;
  2. analyzed → `/upload`;
  3. verified → `/search?band=Verified`;
  4. flagged → `/review`;
  5. reports and stories, which are not linked.

  The frames count appears as a sub-line.
- **Trust distribution:** a 10px stacked bar with segments in band colours and 2px gaps between them. The counts
  come from the `trust_score` values already fetched (rejected assets are excluded, and unscored counted
  separately). The legend below carries the numbers, so the bar is `aria-hidden` and the legend is the content.
  Clicking a legend item goes to `/search?band=…`.
  This is the one "wow" visual on the dashboard: at a glance it shows that the system *judges* evidence.
- **02 Flagged for review:** up to 3 of the lowest-scoring unreviewed flagged assets (§14.3 query addition). Each is a
  compact card with a 72px thumbnail, the badge, and the first flag's human title. It is hidden when there are none.
- **03 Projects:** a ledger table instead of a bullet list. Rows are 52px and the entire row is a link. AVG TRUST is
  computed from the already-fetched assets per project; show a TrustBadge with the score, or `n/a`.
  The existing count is kept. "New project" opens a Sheet with `ProjectForm mode="create"`.
- **04 Suggested projects:** one panel per cluster.
  - Thumbnails: the first 5, 48px each (§14.3 adds `secure_url` to the select), plus a `+N` chip.
  - A mono line with the coordinates and the date range.
  - "Review & create" opens a Sheet with `ProjectForm` prefilled exactly as today, with the submit label `Confirm and create (34 photos)`.
  - The ungroupable line stays as a `text-small --fg-2` note below.
- **Empty workspace** (`stats.total === 0`): replace sections 01–04 with a **pipeline explainer** that doubles as the
  CTA. This is the only place where the product explains itself, because it has no data yet:

```
── GET STARTED
Nothing in the ledger yet.
01 UPLOAD ──── 02 ANALYZE ──── 03 SCORE ──── 04 PROVE
Photos & video   Tags, caption,   Trust score with   PDF + QR anyone
with GPS/time    6 visual signals reasons            can verify
[Upload evidence]
```

  Four columns connected by a 1px rule, each with a mono step number, a `text-title`, and one `text-small` line. On
  mobile it stacks vertically with a vertical rule. There is no illustration.

### 8.2 `/upload` Upload & analyze: `app/upload/page.tsx`

```
── 01 · UPLOAD
Upload evidence
[Dropzone §7.16]
[UploadQueue while active]

── 02 · ANALYSIS
[ProgressLedger §7.15]

── 03 · ALL UPLOADS (44)
[EvidenceTile grid, newest first]
```

- The desktop layout is two columns at `lg`: Dropzone (7 columns) and ProgressLedger (5 columns) side by side, with the grid full width below.
- Grid tiles show the status overlay (pending, analyzing, or failed), the TrustBadge, the MetaLine (the existing
  `exifBadge` logic becomes icons), the tags (at most 3 chips, then `+n`), and the caption.
- The query error ("Could not load assets") becomes an `InlineNotice` error.
- The empty grid shows an EmptyState: "No uploads yet", followed by the size-limits line.

### 8.3 `/projects/[id]` Project: `app/projects/[id]/page.tsx`

This is the richest page and the core of the demo. It is re-ordered to follow the demo story
(**where → when → what changed → proof → share**), with a sticky SectionNav.

```
← Overview
── PROJECT · CLEANUP
Kalindi Kunj ghat cleanup                                  [Edit] [Generate donor PDF]
3 Aug → 14 Sep 2026 · 28 photos · geofence 500 m · 28.54120, 77.30130
⚠ 2 photos are outside the geofence and are flagged for review.   (InlineNotice, --review rule)
──────────────────────────────────────────────────────────────────────────────
Overview  Timeline  Before/after  Evidence  Reports  Campaign        ← SectionNav (sticky, 44px)

── 01 · OVERVIEW
┌─────────────── Scorecard (7 cols) ───────────────┬──── Map (5 cols, 420px) ────┐
│ ScorecardTable §7.9                              │ ProjectMap §7.11           │
│                                                  │ legend + list toggle        │
└──────────────────────────────────────────────────┴─────────────────────────────┘

── 02 · TIMELINE
[TimelineStrip §7.12]

── 03 · BEFORE / AFTER                                   [Find before/after pairs]
┌──── Slider (8 cols) ────────────────────┬─── Pair meta (4 cols) ──────────┐
│ BeforeAfterSlider §7.10                  │ 7 days · 12 m apart            │
│                                          │ Change summary text…           │
│                                          │ Before ↗ asset   After ↗ asset │
└──────────────────────────────────────────┴────────────────────────────────┘
(additional pairs: same layout, stacked; > 3 pairs → show 3 + "Show all N pairs")

── 04 · EVIDENCE (28)                      [Select] [Add unassigned photos (12)]
[EvidenceTile grid, selectable mode when Select is on → sticky action bar: "3 selected · Remove from project"]

── 05 · REPORTS & VERIFICATION                [Generate donor PDF] [Generate CSR PDF]
 KIND    GENERATED            SHA-256                PDF        VERIFY
 donor   14 Sep 2026, 18:02   3f9a1c02…7be41d9a      Open ↗     Public page ↗  [QR]
 A report is a snapshot sealed with SHA-256 … (existing explainer, text-small --fg-3)

── 06 · CAMPAIGN & STORY
[Card previews ×3: Instagram 1:1, Story 9:16, Hindi 9:16, each with label + Download]
[Generate impact story]  Open public story page ↗
Uses only verified photos (trust 80+ or approved). Faces are pixelated.
```

- **Header:**
  - The primary action is "Generate donor PDF", because it is the demo's key moment. It scrolls to section 05 and triggers the same `generate("donor")`.
  - "Edit" (outline) opens a Sheet with `ProjectForm mode="edit"`, replacing the `<details>` at the bottom.
  - The outside-geofence sentence currently says "(shown red, flagged for review in Phase 4)". Drop the phase reference: "2 photos are outside the geofence and are flagged for review."
- **Overview:** below `lg`, the scorecard and map stack (map first on mobile, since "where" orients the viewer).
- **Before/after:** the "Find/Refresh pairs" button and the progress notes use `InlineNotice`. The explainer
  ("Pairs match a later photo to an earlier one within 50 m, at least 3 days apart") sits under the section title in `text-small --fg-3`.
  With no pairs, show an EmptyState with that explainer and the button.
- **Evidence:** the two existing AssetPickers become one grid plus a Sheet.
  - "Select" toggles selectable tiles, and the sticky action bar offers "Remove from project (n)" (the existing unassign call).
  - "Add unassigned photos (n)" opens a Sheet listing the pool (sorted by distance, as today), with the label under each tile (`320 m from center` / `no GPS`), multi-select, and the footer button `Add to project (n)` (the existing assign call).
- **Reports:** a ledger table instead of bullets.
  - The SHA shows its first and last 8 characters in mono with a CopyButton for the full value.
  - The QR column shows a small 32px `QrCode` icon button that opens a popover with the verify URL as text plus a copy button.
    It does **not** generate a new QR (the PDF already contains one). This is navigation, not a new feature.
  - While generating, the table shows a skeleton row: "Building report and PDF… this can take up to a minute."
- **Campaign:** the three card previews keep their aspect ratios (270×270, 180×320, 180×320) in radius-0 frames with
  1px `--line`, a `text-eyebrow` label below (`INSTAGRAM · 1080×1080`), and a "Download" outline sm button. The
  story block stays below. The existing messages are kept, such as "Cards need at least one verified photo…".
  **Do not change `cardUrl`** (Devanagari rendering is verified; see PROGRESS Phase 8).

### 8.4 `/projects/[id]/evidence` Receipts: `app/projects/[id]/evidence/page.tsx`

This page is the target of every scorecard number, so it must say clearly **what number it is proving**.

```
← Kalindi Kunj ghat cleanup
── RECEIPT · GARBAGE VISIBLE · BEFORE
18 photos showing garbage visible
out of 20 analyzed photos in the before set
[Before] [After] [All]     [Showing it] [All analyzed]   ← segmented controls (links, update ?set= & ?part=)
[EvidenceTile grid]
```

- The title is built from the same variables as today, split into a large `text-h1` count sentence and a sub-line.
  The count must equal the scorecard cell (the same code path), so show it prominently.
- The segmented controls are plain links that change `set` and `part` for signal metrics. They are hidden for
  `verified`, `unverified`, and `analyzed`.
- The signals JSON dump becomes **SignalChips** on each tile. Show only the signal that is being proven, in bold,
  plus the others muted: `garbage ✓ · vegetation sparse · 3 people`.

### 8.5 `/assets/[id]` Asset detail: `app/assets/[id]/page.tsx`

This page is the chain of custody for one photo.

```
← Kalindi Kunj ghat cleanup
── EVIDENCE · IMAGE
img_2041                                             (public_id's last segment; full id in Source)
───────────────────────────────────────────────────────────────────────────────
┌──────────── Media (7 cols, sticky) ───────────┐ ┌──── Verdict (5 cols) ─────────────┐
│                                               │ │ ── TRUST                           │
│   [photo, contain, max-h 72vh]                │ │ [TrustBadge lg]                    │
│                                               │ │ [TrustMeter]                       │
│                                               │ │ [AuditTrace]                       │
└───────────────────────────────────────────────┘ │ [Approve A] [Reject R] [Undo]      │
CustodyStrip:                                     └────────────────────────────────────┘
◉ Captured ─── ◉ Uploaded ─── ◉ Analyzed ─── ◉ Scored ─── ○ Reviewed
12 Aug 09:14   Cloudinary      3 tags, 6 sig.  65            unreviewed

── 02 · WHAT'S IN IT
Caption (text-body)
Tags: [cleanup drive] [garbage present]
Signals (KeyValue):  PEOPLE WORKING 3 · WATER no · GARBAGE yes · VEGETATION sparse · STRUCTURE none · SAFETY GEAR no

── 03 · WHEN & WHERE (KeyValue)
TAKEN 12 Aug 2026, 09:14 IST  ·  GPS 28.54121, 77.30118  ·  PROJECT Kalindi Kunj → 

── 04 · SOURCE & TRACEABILITY (KeyValue, mono)
PUBLIC_ID  evidence/inbox/img_2041   [copy]
ORIGINAL   Open original ↗ (accent link)
ETAG       9b1c…  [copy]
PHASH      p:1a2b…  [copy]
```

- **CustodyStrip** (new presentational component, using only fields already on the asset row) has 5 nodes joined by a 1px rule:
  1. **Captured:** done when `taken_at` or GPS exists. The label is the time or "No metadata", and it is neutral, not failed.
  2. **Uploaded:** always done. Shows "Cloudinary".
  3. **Analyzed:** `status === "done"`. Shows the tag count and "6 signals". Failed shows a `--suspicious` dot with "Failed · retry".
  4. **Scored:** `trust_score !== null`. Shows the score.
  5. **Reviewed:** `review_status`.

  A done node is a filled `--fg` 10px circle; a pending node is hollow. It scrolls horizontally on mobile.
- Video assets: the media column shows `<video controls>` (radius 0). Below it:
  - **Transcript** in a `--surface-1` panel, 15/26, max-height 320px with its own scroll, and a "Show all" toggle.
  - **Key frames** as a horizontal strip of 160×120 tiles with timecode chips and trust badges.
- Frame assets: a Panel above the details, "Frame at **0:45** of video `img_…`", with the embedded parent video at
  `#t=45` and the link "Open the original video at 0:45 ↗", as today.
- A pending image keeps `AnalyzeOneButton`. Restyle it as an outline button with a clear cost line underneath:
  "Uses about 650 AI Vision units. Results are cached." Never auto-run it.
- Mobile: the media is full-bleed, and the Verdict panel follows it (not sticky).

### 8.6 `/review` Review queue: `app/review/page.tsx`

```
── QUALITY CONTROL
Review queue                                   [Recompute all trust scores] ← ghost
6 flagged for review · 4 reviewed                 J/K move · A approve · R reject · U undo · ↵ open
── 01 · FLAGGED FOR REVIEW (6)   sorted: lowest score first
[ReviewCard §7.17] ×n
── 02 · REVIEWED (4)   (collapsed by default: a <details> styled as a section header with a chevron)
[compact rows]
```

- **Keyboard triage** (client component wrapper, `components/ReviewQueue.tsx`):
  - `J`/`K` move the cursor; the first card is active on load.
  - `A` approves, `R` rejects, and `U` undoes the last action. `Enter` opens the asset page.
  - Shortcuts are ignored when focus is in an input. A visually hidden `aria-live` region announces
    "Approved img_2041. 5 left."
  - Actions call the existing `/api/assets/[id]/review` exactly as `ReviewButtons` does.
- The RecomputeButton result becomes an InlineNotice: "Recomputed 44 assets. No AI credits used."
- Empty queue: an EmptyState with a `ListChecks` icon, "Nothing flagged for review", and "New flags appear here after upload and analysis."

### 8.7 `/search` Search: `app/search/page.tsx`

```
── DISCOVER
Search evidence
[⌕  Describe what you're looking for, e.g. "garbage near the road"          Search ↵]
PROJECT [Any ▾]  TAG [Any ▾]  TRUST [Any ▾]  FROM [date]  TO [date]  TYPE [Images and videos ▾]   Clear
───────────────────────────────────────────────────────────────────────────────
12 results · best match first          (or "· newest first" in filter mode)
[EvidenceTile variant=match grid]
```

- It remains a **GET form, with no JS required**. Filters sit in one row at `lg` and wrap on smaller screens. On
  mobile they collapse into a "Filters (2)" disclosure that shows the count of active filters.
- Active filters also appear as removable chips above the results (each chip is a link that removes one param).
- Tag option labels are shown with spaces (`cleanup drive`) while the values stay unchanged.
- The result tile:
  - The **match chip** shows `87% match` (the existing `Math.round(similarity*100)`), or `Words in transcript` for transcript matches.
  - Video frames show the FRAME timecode overlay.
  - The transcript snippet shows in `text-small` italic, with the query words wrapped in `<mark>` (styled
    `--accent-tint` background, `--fg` text, no italics).
  - Tiles also carry the TrustBadge, the caption, the tags, and the project name.
- States:
  - Initial: a hint line plus 3 example query chips (`garbage near the road`, `people planting trees`, `water body`).
    Each is a link to `/search?q=…`. The examples come from the existing taxonomy vocabulary; this is not a new feature.
  - Error: an InlineNotice error with "Search failed: …".
  - No results: an EmptyState that includes the existing hidden-count message and "Only analysed photos can be found by description."

### 8.8 `/verify/[reportId]` Public verification: `app/verify/[reportId]/page.tsx`

This is the QR target and **the second wow moment**. The audience is a judge on a phone, so design mobile-first.

```
▣ Overlook · Public report verification                         (minimal header, no nav)

[VerifySeal §7.14 with hash animation §9.2]
Open the PDF report ↗

This confirms the report was not changed after it was generated. How reliable each
photo is appears in its trust score and flags below; flagged photos are marked for
human review, not declared false.                                    (existing copy)

── 01 · PROJECT          KeyValue: name, activity, dates, site coords, geofence
── 02 · SCORECARD        StatFigures (photos, analyzed, coverage %, avg trust) + table (no links: public)
── 03 · BEFORE / AFTER   pairs: two images side by side (stacked on mobile), summary, ids in mono
── 04 · EVERY PHOTO BEHIND THIS REPORT (24)
   ┌──────┬────────────────────────────────────────────────────────────┐
   │thumb │ evidence/inbox/img_2041                   [■ Verified · 92] │
   │120×90│ 12 Aug 2026, 09:14 · 28.54121, 77.30118                     │
   │      │ Original ↗   Transformation used in report ↗                │
   │      │ etag 9b1c… · pHash p:1a…                                     │
   └──────┴────────────────────────────────────────────────────────────┘
▸ Check it yourself   (details: canonical JSON rule, sorted keys, no whitespace, SHA-256)
```

- Replace the emoji with the VerifySeal, keeping the existing wording for the match and mismatch sentences.
- The asset rows use TrustBadge and the flags as compact FlagRows (title + reason, no deductions, since the manifest
  stores flags but the score is authoritative).
- Provenance links ("Original", "Transformation used in report") use the `--accent` link style with `ArrowUpRight`.
  These are exactly the traceability requirement, so make them prominent.
- The story-manifest redirect behaviour is unchanged.

### 8.9 `/story/[projectId]` Public impact story: `app/story/[projectId]/page.tsx`

An editorial, calm, shareable page. It is the only place where the type gets large.

```
▣ Overlook · Impact story
── CLEANUP · 3 AUG 2026 TO 14 SEP 2026
Kalindi Kunj ghat cleanup                   text-h1
Garbage seen in 81% fewer photos after      text-display (headline.en; 300 weight, key figure 600)
the cleanup drive
────────────────────────
01 THE PROBLEM     body (max 60ch)
02 WHAT WE DID     body
03 THE RESULT      body
── IN NUMBERS: 3 StatFigures (value text-data-xl, label below), no links
── BEFORE AND AFTER: BeforeAfterSlider with the pixelated images (reuse the component) + summary
Footer: Built from 31 verified photos (of 40 uploaded)… · Narrative written by AI from these facts only · Integrity check: passed [Fingerprint]
```

- The three narrative sections use a two-column layout at `md` and up: a 160px mono label column (`01 THE PROBLEM`) and the body.
- Integrity: "passed" gets a small `--verified` check mark and text; "FAILED" gets an InlineNotice error at the **top** of the page, not only in the footer.
- The "No story yet" state is an EmptyState: "No story has been published for this project yet."
- Render `headline.en` only, as today. The manifest also holds `headline.hi`, but Hindi belongs on the campaign
  card (CLAUDE.md §7.7), so **do not add Devanagari to this page**.

### 8.10 System pages

| Route file | Design |
|---|---|
| `app/loading.tsx` | Replace "Loading…" with a skeleton of the page header (eyebrow bar 80px, title bar 320px, meta bar 480px) and one grid of 8 square skeleton tiles. `role="status"` with visually hidden "Loading". Add route-level `loading.tsx` for `projects/[id]` (header + scorecard/map skeleton) and `assets/[id]` (media + verdict skeleton). |
| `app/error.tsx` | The page header pattern: eyebrow `ERROR`, title "Something went **wrong**", the message in an InlineNotice error, the three existing checklist items as a numbered list, the digest in mono, and a "Try again" primary button. |
| `app/not-found.tsx` | Eyebrow `404`, title "Not **found**", the existing sentence, and a "Back to overview" outline button. |

---

## 9. Signature moments (proof-of-concept motion)

These are the three moments a judge should remember. Each runs **once**, is skipped under reduced motion, and never
delays access to the information: the final values are in the DOM, and in the accessibility tree, from the first render.

### 9.1 "Show the math": the trust countdown on `/assets/[id]`

- **Trigger:** first render of the AuditTrace (on mount; it is above the fold on desktop).
- **Sequence** (total at most 1,100ms):
  1. The total figure shows **100** and the rows below the starting row are at `opacity 0; translateY(4px)`.
  2. Each deduction row enters in turn (180ms each, 120ms stagger). As it lands, the total counts down to the
     running value (integer steps over 180ms, `tabular-nums` so nothing jiggles).
  3. The cap row, if one applies, enters last and the total snaps to the capped value with a 1px `--fg` underline flash (200ms).
  4. The TrustBadge and the TrustMeter fill animate to the final band (200ms).
- **Accessibility:** the visible counter is `aria-hidden` during the animation. A visually hidden element holds the
  final "Trust score 40, Suspicious" from the start.

### 9.2 "Recompute the seal": the hash reveal on `/verify/[reportId]`

- The hash is computed **on the server** (the existing `manifestHash`). The animation is purely cosmetic and communicates "we recomputed this".
- **Sequence** (700ms):
  1. The RECORDED hash is shown statically.
  2. The RECOMPUTED hash resolves block by block, left to right: each 8-character block cycles through random hex glyphs for 60ms, then settles on its real value. The blocks are staggered by 70ms.
  3. When a block settles, if it equals the recorded block it briefly gets an `--accent-tint` background (150ms fade). On a mismatch, the differing characters settle in `--suspicious`.
  4. When all blocks have settled, the seal's left rule animates in (`scaleY 0 → 1`, 200ms) and the headline fades from 0.4 to 1.
- The result text is in the DOM from the start, as `role="status"`.

### 9.3 "Scrub the change": the slider intro on `/projects/[id]`

- On the first entry of the first BeforeAfterSlider into the viewport (IntersectionObserver, threshold 0.6), the
  divider eases 50 → 32 → 50 (900ms, `--ease` standard). This tells the viewer "drag me" without any instruction text.

### 9.4 "Watch it get checked": the landing page

**The hero develop sequence** runs once on mount:
1. All 12 frames are undeveloped.
2. From 500ms, frames develop left to right and top to bottom every 170ms (a 1200ms cross-fade each).
3. The 3 flagged frames do not develop. At their turn, their red crop marks and label chip appear (250ms).
4. The bottom edge-print counter counts `n / 12 checked · k flagged`.

Under reduced motion it renders the final state at once.

**The scroll story.** The progress `p` (0–1) of the active step is measured from its top crossing 55% of the
viewport. The stage is a pure function of `(chapter, p)`:

| Chapter | Stage behaviour by progress |
|---|---|
| 01 Capture | The photo is undeveloped. Readout rows appear at p = .08, .26 and .44 (Taken, GPS, Source). The crosshair and coordinate label appear at p > .45. Trust: "Not scored". |
| 02 Analyze | Tag chips appear at .08 and .20. The signals line appears at .34. The caption types out character by character from .46 to .82, with a blinking caret. |
| 03 Check | The two pHash grids reveal row by row from 0 to .32, with the 3 differing bits outlined. At .34 the distance shows **3** in `--suspicious`, the deduction row "−40" appears, the score goes to 60 and red crop marks appear on the photo. From .44 to .64 the minimap pin slides out of the geofence ring along a dashed line and turns red, with the label "1,812 m". At .64 the row "−25" appears and the score goes to 35 (Suspicious). The "Flagged for review" chip then shows on the photo. |
| 04 Measure | The slider divider moves from 88% to 12% as p goes from 0 to .75. The scroll *is* the scrub. The after-column numbers count from the before-rate to the real after value, and their bars follow. |
| 05 Prove | At p > .08 the whole story section **turns cyanotype** (background `--cy` over 600ms, and the tokens re-map inside the section). The report sheet (paper, rotated −1.2°, with a QR) sits above. The recomputed hash resolves 8 blocks as p goes from 0 to .70. The seal ring stroke draws from .72 to .88. At the end the check fills and the headline reads "Report unchanged". |

Reduced motion changes only the transitions (they become instant). Everything is still driven by scroll position,
which the user controls, so nothing moves on its own.

Everything else is quiet: hover colour shifts, the 200ms progress-bar width, and the analyzing sweep on tiles.

---

## 10. Content and copy rules

1. **Never** "fake", "fraud", or "detected". Use **"Flagged for review: …"** (from CLAUDE.md). Info flags say "unverifiable, not fake".
2. Numbers carry their denominators and units: "18/20", "1,812 m", "7 days", "65 / 100". Use `Intl.NumberFormat("en-IN")` for thousands.
3. Dates and times are always IST, using the existing `lib/dates.ts` (`formatDay`, `formatTime`). Eyebrow dates are uppercase short (`12 AUG 2026`).
4. Buttons are verbs that describe the outcome: "Generate donor PDF", "Analyze 26 pending", "Confirm and create (34 photos)".
   Progress forms end with an ellipsis: "Building PDF…".
5. Do not say "AI-powered". Where AI provenance matters (the story narrative), keep the existing factual line: "Narrative written by AI from these facts only."
6. Cost transparency: any button that spends AI Vision units states the approximate cost next to it (AnalyzeOne, Analyze pending).
7. Truncation:

   | Content | Rule |
   |---|---|
   | `public_id` | Middle ellipsis, keeping the last segment |
   | Hashes | First 8 + last 8 characters, with the full value copyable |
   | Captions | 2-line clamp in tiles and full text on the asset page |
   | Project names | 1-line ellipsis in tables and full text in headers (wrap) |
   | Tags | At most 3, then `+n` |

8. Character budgets:

   | Content | Budget |
   | --- | --- |
   | Page titles | Handle up to 80 characters (wrap to 2 lines, never truncate) |
   | Tile captions | Clamp at 2 lines |
   | Flag titles | Fixed strings from §7.6 |
   | Hindi | Only on the campaign card (a Cloudinary overlay), so there are no Devanagari UI strings to budget |

---

**Dashes.** Do not use em dashes or en dashes in UI copy, in AI prompts' output, or in these docs. Use a colon, comma,
period or parentheses. "No value" is the text `n/a` (`NA` in `lib/copy.ts`), and a range is written with the word "to"
or an arrow. The story prompt in `lib/gemini.ts` tells the model the same.

## 11. Responsive behaviour

| Area | ≥ 1280 (xl) | 1024–1279 (lg) | 768–1023 (md) | < 768 (mobile) |
|---|---|---|---|---|
| Top bar | Full: nav + search + toggle | Same; search 220px | Search hidden (nav item remains) | Wordmark + review chip + menu sheet |
| Dashboard stats | 5 across | 5 across | 3 + 2 | 2 columns; the 5th spans both |
| Projects table | All columns | All | Hide DATES | Rows become 2-line list items (name / meta line) |
| Project overview | Scorecard 7 / map 5 | 7 / 5 | Stacked; map 360px | Stacked, **map first**, 300px |
| Scorecard table | Before, after, change, all | Same | Hide the mini bars | Each signal becomes a stacked card: label, then `before → after` fractions; hide "all" behind "More" |
| Slider + meta | 8 / 4 | 8 / 4 | Stacked | Full-bleed slider (negative gutter), meta below |
| Evidence grid | auto-fill, min 168 | min 168 | min 150 | 2 columns, 8px gap |
| Asset page | Media 7 (sticky) / verdict 5 | 7 / 5 | Stacked | Media full-bleed; verdict follows |
| Review cards | Thumbnail 240 left | 200 | 160 | Thumbnail on top, full width 4:3; action buttons full width, 48px tall |
| Verify page | 880 container | same | same | Hash blocks wrap 2 per line; asset rows stack thumb above text |
| Sheets | Right 480px | Right 480px | Right 420px | Bottom sheet, 90vh |

Touch targets are at least 44×44px on mobile (buttons grow to 44px tall under `md`). Hover-only affordances
(timeline arrows, receipt previews) always have a tap or scroll equivalent.

---

## 12. Accessibility

- **Landmarks:** one `<header>` (the top bar) and one `<main id="main">`. The first focusable element is a "Skip to content" link, visible on focus.
- **Headings:** exactly one `h1` per page. Section titles are `h2`; panels inside sections are `h3`. Eyebrows are `<p>` with `aria-hidden` when they repeat the heading text.
- **Focus order** follows the visual order. Sheets trap focus and return it to the trigger on close; Escape closes them.
- **Colour:** trust is never colour-only (mark shape + label + score). Band text contrast is ≥ 4.5:1 in both themes.
- **Keyboard:**
  - slider: arrow keys, Home, and End;
  - review: J, K, A, R, U, and Enter;
  - `/` focuses the search field;
  - all tiles are single tab stops.
- **Live regions:** analysis progress (`polite`); review actions (`polite`); errors (`alert`); copy confirmations (`polite`).
- **Images:**
  - evidence tiles use `alt={caption ?? "Photo " + public_id last segment}`;
  - decorative thumbnails inside already-labelled links use `alt=""`;
  - before/after images use `alt="Before, 12 Aug 2026"`.
- **Map:** provide the list-view equivalent (§7.11). Pins get `title` or `aria-label` through the popup content.
- **Motion:** `prefers-reduced-motion` is fully honoured (§5).
- **Forms:** every input has a visible label. Errors are linked with `aria-describedby`. Required fields are marked with text, not only with `*`.

---

## 13. Edge cases and system states

| Case | Behaviour |
|---|---|
| Empty workspace | Dashboard pipeline explainer (§8.1); other pages show EmptyStates with one action. |
| Asset without GPS or time | A neutral "No metadata" chip; the trust cap row is explained; the map omits it and the list view shows "no GPS". |
| Asset pending or analyzing | Tile overlay; AuditTrace still renders the non-AI flags (duplicate, geofence, time); a note says "AI checks run after analysis". |
| Analysis failed | A red FAILED overlay, and the retry route is reachable from the Upload page; the asset page shows the failed CustodyStrip node and a "Retry failed / stuck" link. |
| Rate limited (Gemini 429) | ProgressLedger countdown notice; never an error colour (it is expected on the free tier). |
| Score null | TrustBadge "Not scored"; excluded from the distribution bar's band segments (counted as "Not scored"). |
| Approved but score < 80 | The badge shows the band from the score plus `· approved` with UserCheck. It counts as verified (existing rule), and the tooltip explains "Approved by a reviewer". |
| Flagged but score ≥ 80 (e.g. wrong date only) | The badge is Verified; the review queue still lists it (existing behaviour); the AuditTrace shows the −15. |
| Scorecard with no phases | Hide the before, after, and change columns; show the neutral note. |
| No project centre | The map shows an EmptyState "Set a centre or add photos with GPS" with an "Edit project" button. |
| 0 pairs | An EmptyState with the explainer and the button. |
| > 3 pairs | Show 3, then "Show all N pairs" (client toggle). |
| Very long project name / public_id | Wrap in headers; ellipsis in tables (§10.7). |
| Slow network | Skeletons on route loads; long operations (PDF, up to 60s) show progressive copy and lock their buttons; nothing blocks the rest of the page. |
| Images fail to load | The tile shows a `--surface-2` block with an `ImageOff` icon and "Image unavailable", keeping its aspect ratio. |
| Mismatched report hash | The seal uses the `--suspicious` rule and "Report **altered**"; differing hash characters are highlighted; the existing "Do not rely on this report" copy is kept. |
| Story integrity failed | A top-of-page error notice plus the footer line. |
| Many assets (500+ in review) | The list is fine at demo scale (the query is limited to 500); keep rendering simple and do not virtualise. |
| Hindi | Only inside card images; the UI needs no Devanagari font. |

---

## 14. Implementation notes for Claude Code

### 14.1 Principles
- **No new npm dependencies.** Everything uses what is installed: Next 16, Tailwind 4, the shadcn base-ui variant, `lucide-react`, `tw-animate-css`, `react-leaflet`. Fonts come through `next/font/google` (§4.2), which is built into Next, not a dependency.
  - If a shadcn primitive is needed (sheet/dialog, tooltip), add it with `npx shadcn add sheet tooltip`. It uses `@base-ui/react`, which is already installed.
  - No framer-motion, no toast library, no chart library (bars are plain divs).
- Components stay presentational; data loading stays in the pages and `lib/`, as today.
- Keep files under ~200 lines (CLAUDE.md §11). Split big pages into section components (`components/project/ScorecardSection.tsx`, etc.) if needed.
- Read `node_modules/next/dist/docs/` for any Next 16 API you touch (AGENTS.md). Route groups and `loading.tsx` are standard.
- Server components by default. Client components only for:
  - Uploader, AnalysisPanel, PairsPanel, BeforeAfterSlider, ReportsPanel, StoryPanel;
  - ReviewQueue, AssetPicker/Sheet, AuditTrace (animation), HashBlock (animation), SectionNav;
  - the ThemeToggle, CopyButton, and the map.

### 14.2 The one allowed logic refactor (behaviour-neutral)
In `lib/trust.ts`, extract the inline deduction numbers into an exported constant and use it inside `computeTrust`:

```ts
export const TRUST_DEDUCTIONS = {
  DUPLICATE_EXACT: 50, DUPLICATE_REUSED: 40, PHOTO_OF_PHOTO: 35,
  OUTSIDE_GEOFENCE: 25, OUTSIDE_TIMEFRAME: 15, IRRELEVANT: 10,
} as const
export const NO_METADATA_CAP = 60 // already exists; just export it
```

AuditTrace reads these constants, so the UI's arithmetic can never drift from the scoring. `npm test` must still pass unchanged.

### 14.3 Allowed query-only additions (no new routes, no schema change)
| Page | Addition | Why |
|---|---|---|
| `/` | Add `secure_url` to the assets select | Suggestion thumbnails and flagged-card thumbnails |
| `/` | Derive per-project average trust and band counts from the already-selected `trust_score` | Projects table, distribution bar |
| `/` | Derive the flagged list from the already-selected `trust_flags` and `review_status` (top 3 by lowest score) | Section 02 |
| `app/layout.tsx` | `getCounts()` and `computeStats` for the analysis line and the review count (one light query) | Top bar |
| `/dashboard` | The 16 newest assets (`id, secure_url, resource_type, status, trust_score, trust_flags, review_status, created_at`) | Latest evidence contact sheet |
| `/` (landing) | `computeStats` over the same light select as the layout; the latest non-social report id | CTA numbers, the "Verify →" link |
| `/assets/[id]` | Nothing new; the CustodyStrip uses existing fields. For `DUPLICATE_*` evidence, optionally fetch the matched asset's `secure_url` for a 40px thumbnail | AuditTrace evidence |

Anything beyond this table needs the user's approval.

### 14.4 Tokens: replace the `:root`/`.dark` blocks in `app/globals.css`

Keep the `@import` lines. Replace the theme blocks with the following and map shadcn variables onto the tokens, so existing shadcn components inherit the design.

```css
@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: var(--font-body);        /* FIX: was self-referencing → Times */
  --font-heading: var(--font-display);
  --font-mono: var(--font-data);

  --color-bg: var(--bg);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-fg: var(--fg);
  --color-fg-2: var(--fg-2);
  --color-fg-3: var(--fg-3);
  --color-accent-ink: var(--accent);        /* named -ink to avoid clashing with shadcn "accent" */
  --color-accent-tint: var(--accent-tint);
  --color-verified: var(--verified);
  --color-verified-tint: var(--verified-tint);
  --color-review: var(--review);
  --color-review-tint: var(--review-tint);
  --color-suspicious: var(--suspicious);
  --color-suspicious-tint: var(--suspicious-tint);

  /* shadcn mapping: keep the existing --color-* lines, EXCEPT these two, which must not turn blue */
  --color-accent: var(--surface-2);
  --color-accent-foreground: var(--fg);
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 6px;
}

:root {           /* Paper (light) */
  --bg:#F5F4F0; --surface-1:#FBFAF8; --surface-2:#EFEEE9; --surface-3:#E6E4DD;
  --line:#E0DED7; --line-strong:#C9C6BD;
  --fg:#141412; --fg-2:#52504A; --fg-3:#6D6B64;
  --accent:#2F4FC4; --accent-tint:#E4E9F8;
  --verified:#237A4B; --verified-tint:#E3F0E7;
  --review:#8A5600; --review-tint:#F7EBD2;
  --suspicious:#B3261E; --suspicious-tint:#F8E1DE;
  --scrim: rgb(0 0 0 / .62);
  --dur-1:120ms; --dur-2:200ms; --dur-3:320ms; --dur-4:700ms;
  --ease: cubic-bezier(.2,0,0,1); --ease-emph: cubic-bezier(.3,0,0,1); --ease-exit: cubic-bezier(.4,0,1,1);

  --background:var(--bg); --foreground:var(--fg);
  --card:var(--surface-1); --card-foreground:var(--fg);
  --popover:var(--surface-1); --popover-foreground:var(--fg);
  --primary:var(--fg); --primary-foreground:var(--bg);
  --secondary:var(--surface-2); --secondary-foreground:var(--fg);
  --muted:var(--surface-2); --muted-foreground:var(--fg-2);
  /* shadcn's hover "accent" is remapped in @theme inline, see the note below */
  --destructive:var(--suspicious);
  --border:var(--line); --input:var(--line-strong); --ring:var(--accent);
  --radius: 0.375rem;
}

.dark {           /* Darkroom (default) */
  --bg:#0D0D0C; --surface-1:#141413; --surface-2:#1B1B19; --surface-3:#242421;
  --line:#2A2A27; --line-strong:#3A3A36;
  --fg:#EDECE7; --fg-2:#A8A69E; --fg-3:#85837B;
  --accent:#8FA7F2; --accent-tint:#161C2E;
  --verified:#6FCF97; --verified-tint:#11271A;
  --review:#E9B44C; --review-tint:#2B2210;
  --suspicious:#F2877B; --suspicious-tint:#2E1512;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0ms !important; animation-iteration-count: 1 !important; transition-duration: 0ms !important; }
}
```

> **Note on the name clash:** shadcn uses `--accent` for hover backgrounds. Our `--accent` is the cyanotype blue.
> Point shadcn's `--color-accent` at `var(--surface-2)` and its `--color-accent-foreground` at `var(--fg)` in
> `@theme inline`, and use `text-accent-ink` / `bg-accent-tint` / `outline-accent-ink` for ours. Grep for `accent`
> after the change to make sure nothing turns blue by accident.

Type utilities (Tailwind v4 `@utility`, in `globals.css`):

```css
@utility text-eyebrow { font-family: var(--font-mono); font-stretch: 112.5%; font-size: 10.5px; line-height: 16px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); }
@utility text-data    { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12px; line-height: 20px; font-variant-numeric: tabular-nums; }
@utility text-hash    { font-family: var(--font-mono); font-stretch: 75%; font-size: 12.5px; line-height: 20px; }
@utility text-data-xl { font-family: var(--font-mono); font-stretch: 81%; font-size: 40px; line-height: 42px; font-weight: 300; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
@utility text-micro   { font-family: var(--font-mono); font-size: 9.5px; line-height: 14px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
@utility text-h1      { font-family: var(--font-heading); font-size: 34px; line-height: 40px; letter-spacing: -.025em; font-weight: 300; }
@utility text-h2      { font-family: var(--font-heading); font-size: 19px; line-height: 26px; letter-spacing: -.01em; font-weight: 600; }
@utility text-display { font-family: var(--font-heading); font-size: 56px; line-height: 60px; letter-spacing: -.03em; font-weight: 300; }
```

(Add the mobile sizes from §4.2 with `max-md:` overrides at the usage site, or with a media query inside the utility.)

`app/layout.tsx`:
- set `metadata.title` to `{ default: "Overlook", template: "%s · Overlook" }`;
- set the description to "Verified, searchable, measurable field evidence.";
- add `className="dark"` as the SSR default plus the inline theme script;
- give each page its own `export const metadata` or `generateMetadata` title, for example "Review queue" or the project name.

### 14.5 Build order (each step leaves the app working)
1. **Tokens, fonts, and the Times fix** (`globals.css`, `layout.tsx`); theme script and toggle.
2. **Shell:** `AppShell` top bar, route groups for the public pages, skip link.
3. **Primitives:** Button variants, inputs and select, Panel, Chip, KeyValue, InlineNotice, EmptyState, Skeleton, Kbd, CopyButton, `flag-copy.ts`.
4. **Trust atoms:** TrustBadge, TrustMeter, FlagRow, AuditTrace (with the §14.2 refactor and `npm test`).
5. **EvidenceTile**, then swap it into `/upload`, `/search`, `/projects/[id]/evidence`, and the pickers.
6. **Landing** (`/`, §8.0 and §9.4), and move the dashboard to `/dashboard`.
7. **Pages, in demo order:** `/dashboard` → `/upload` → `/projects/[id]` (Scorecard, Map, Timeline, Slider, Reports, Campaign, Sheets) → `/assets/[id]` → `/review` → `/search` → `/verify` → `/story` → system pages.
8. **Signature motion** (§9.1–9.3) last, behind the reduced-motion guard.
9. **Verify:** `npm run typecheck && npm run lint && npm test`, then `npm run seed` plus a full walk-through in the browser in both themes and at 375px. `npm run check-demo` must still PASS.

### 14.6 Out of scope (do not touch)
- `lib/report-pdf.tsx` layout, apart from optionally matching the colours of the trust band text (`#237A4B` / `#8A5600` / `#B3261E`) in the evidence table. The PDF uses built-in Helvetica/Courier; keep it that way.
- `lib/cards.ts` overlays (Devanagari rendering is verified; any change risks the Hindi card).
- API routes, `lib/*` math, the Supabase schema, and the Cloudinary/Gemini calls.
- Adding auth, i18n, new pages, charts beyond the divs described here, or any AI call triggered by page load.

---

## 15. Acceptance checklist

- [ ] Computed fonts are Funnel Sans (body), Funnel Display (h1/h2) and Martian Mono (data), not Times; the tab title is "Overlook", not "Create Next App".
- [ ] No hex colour appears in components outside the token file (grep `#[0-9a-fA-F]{3,6}` in `components/` and `app/`; allowed only in the Leaflet colour read-out and the PDF).
- [ ] No gradients except the photo scrim; no `backdrop-blur`; no `rounded-xl` or larger; no emoji in UI strings.
- [ ] Every TrustBadge shows the mark shape, the label, and the score, and reads correctly in greyscale.
- [ ] Every scorecard number is still a link, and the evidence page count equals the clicked number.
- [ ] The asset page AuditTrace arithmetic equals `trust_score` for every seeded planted problem (`npm run seed`).
- [ ] The verify page shows the seal with both hashes; a tampered manifest shows "altered" with the differing characters highlighted.
- [ ] Slider: drag, click, keyboard (←/→, Home/End); screen reader announces the value.
- [ ] Review: J/K/A/R/U work; focus moves to the next card; Undo works.
- [ ] Reduced motion: no animation anywhere; final values visible immediately.
- [ ] 375px width: no horizontal page scroll; all actions reachable; touch targets ≥ 44px.
- [ ] Both themes pass AA contrast for all text (spot-check with devtools).
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run check-demo` all pass.
- [ ] Wording: no "fake" or "fraud" anywhere in the UI (grep).
- [ ] `/` shows the landing page. "Open the ledger" opens `/dashboard`. Every old link to the dashboard now points at `/dashboard`.
- [ ] The landing hero develops 9 frames and leaves 3 blue with red crop marks. The story replays correctly when scrolling up.
- [ ] At 375px the landing page's sticky stage never covers the step text, and there is no horizontal scroll.
- [ ] Undeveloped (blue) means only "not yet verified" everywhere; the asset page's main image is always full colour.
- [ ] The landing page claims nothing the app doesn't do (compare against the README feature table).

---

## 16. Implementation status and deviations (as built)

The frontend was implemented from this spec and checked in the browser against seeded demo data (desktop, 375px, both
themes). Where the build differs from the text above, **the build reflects a decision made while verifying it**:

| Area | Spec said | As built | Why |
|---|---|---|---|
| Landing photos | JPGs in `public/landing/` | Canvas-drawn sample scenes (`components/landing/scenes.ts`), always labelled "sample" / "illustrative case" | No real photos were available to ship; this needs no files and no quota. To use real photos later, swap `SampleCanvas` for `<img>`. |
| Sticky bars | `bg-bg/92`, no blur | Fully opaque `bg-bg` | At 90% the page text was visible through the bar, which looked broken. |
| Dashboard numbering | 01 chain, 02 flagged, "Latest evidence" unnumbered, 03 projects, 04 suggested | 01 chain, 02 flagged, 03 latest evidence, 04 projects, 05 suggested | Consistent numbering. |
| Project header primary | "Generate donor PDF" (triggers it) | "Reports & PDF" (anchor to section 05, where the button lives) | Avoids duplicating the generate logic and progress state in two places. |
| Search filters on mobile | Collapse into "Filters (n)" | Always visible, wrapping to two columns | The form is a plain GET form; a collapsible needed JS. |
| Stat rows | `border-y` with `border-l` dividers | Box grid (`border-l border-t` on the row, `border-r border-b` on cells) | Dividers broke when a row wrapped onto a second line. |
| Small tiles | Same chips as large tiles | `compact`: no PENDING / video chips, flag label shrinks to 2 lines | Chips covered the whole photo at 48-100px. Blue already means "not proven yet". |
| Mobile menu | Right sheet | Bottom sheet (`Sheet`, 90vh) | Same component as the other sheets. |
| Timeline | Fade masks and ‹ › buttons | Plain scroll with snap | Not needed to read the strip. |
| Search data | Not listed in 14.3 | Added `status, trust_flags, lat, lng` to the select in `lib/search.ts` | Tiles need them to draw the develop state and MetaLine. Select-list change only. |

Deliberately not done: `next build` was not run (a dev server was already using `.next`), and there was no real-phone check.

**Second pass (page headers, empty states, dash cleanup).**

| Area | Change |
|---|---|
| Section labels | The 24px rule (read as em dashes) is replaced by the blue highlighter mark (4.2). One shared `Eyebrow` component, so the landing page and every app page change together. |
| Page headers | Landing-style hero title, live lede, optional aside (6.2). Applied to dashboard, upload, review, search, project, photo and receipt pages. |
| Empty states | `SampleSheet` (extracted from the landing hero) shows an illustrative roll that develops from blue to colour: dashboard hero, upload grid, review ("all clear" mode). `EmptyState` gained a `visual` slot. Search, project and report empty states keep the plain restyled panel. |
| Dashes | Every em and en dash removed from `app`, `components`, `lib` and this file. Empty values read `n/a`. `lib/trust.ts` LOW_CONFIDENCE reason now reads "...; needs a human look" (CLAUDE.md 7.2 quotes the old wording). |
| Motion | `.reveal` on `Section` headings, CSS only, `@supports (animation-timeline: view())`, off under reduced motion. |
