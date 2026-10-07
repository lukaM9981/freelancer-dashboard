# Olifant Digital — Design System (DS-V2.2 · Blog Content)

The brand and visual foundations for **Olifant Digital**, a full-service Amazon
& e-commerce marketing agency. *Olifant* is Afrikaans/Dutch for **elephant** —
the walking-elephant mark is the brand's signature.

**This version is scoped to blog & social graphic content creation only.**
Presentation/deck and web/UI-kit templates from earlier versions have been
removed; the brand foundations (color, type, spacing, components) remain so blog
graphics stay on-brand. The aesthetic is **clean, flat, data-forward, and
professional** — no decorative noise, no gradients-for-gradients'-sake, no
clutter. Yellow does the talking; everything else gets out of its way.

---

## Sources

- **Figma (blog reference)** — **`Claude-Blog-Content-Template.fig`** is the main
  reference for this version's blog/social graphic templates.
- **Figma (foundations)** — "Claude-DS.fig". One page, four foundation frames:
  `01 Typography Scale`, `02 Color Palette`, `03 Spacing Tokens`, `04-05-06
  Buttons, Forms & Cards`. All token + component values below were read from this
  file (not from a public brand spec).
- **Logos** — `OD_Full-Logo-DR.png` (wordmark + elephant), `OD_Simple-Logo-DR.png`
  (elephant mark). Copied into `assets/` with white & yellow recolors.
- **Brand colors (provided)** — Yellow `#FFD046` primary, Pine `#D0E0C9` accent,
  Off-white `#FFFEF9` background, Ink `#0F0B08` text.

> **Fonts:** Satoshi (body/UI) and **Wulkan Display Bold** (headings) are
> self-hosted from `assets/fonts/`; JetBrains Mono (data) loads from Google
> Fonts. All three are the real brand faces. See `tokens/fonts.css`.

---

## Content fundamentals

How Olifant writes copy across UI, decks and marketing:

- **Voice:** confident, plain-spoken, results-led. Strategic but never fluffy.
  "We combine strategic thinking with exceptional craft to deliver results that
  matter." "Building brands that matter." "Transform your presence."
- **Person:** speaks as **"we"** (the agency) to **"you/your"** (the client).
  e.g. "we shape how the world experiences your business."
- **Casing:**
  - Headings (serif): **Title-case sentence fragments**, no terminal period —
    "The future of digital experience", "Crafting compelling narratives".
  - Eyebrows / labels / section numbers: **ALL-CAPS** with wide tracking —
    "04 — BUTTONS", "GET STARTED TODAY", "CASE STUDY".
  - Body: sentence case, full punctuation.
  - Buttons: title case ("Get Started") for primary/secondary; **ALL-CAPS** for
    tertiary/ghost ("GET STARTED").
- **Numbers carry the message.** Data is foregrounded — big Satoshi-Black stats
  ("247%", "+180% Revenue"), short supporting captions ("Conversion increase",
  "vs. previous quarter").
- **Length:** short. Punchy headlines, 1–2 sentence support paragraphs. No walls
  of text.
- **No emoji.** Ever, in brand surfaces. Tone is professional. Iconography is
  line icons, not emoji or unicode glyphs.
- **Vibe:** an editorial, agency-grade confidence — serif headlines give it a
  publishing feel; the mono labels add a precise, analytical edge fitting a
  data-driven e-commerce shop.

---

## Visual foundations

- **Color.** Off-white canvas (`#FFFEF9`), ink text (`#0F0B08`→`#19130D`).
  Brand yellow `#FFD046` is the single hero accent — used sparingly for primary
  actions, highlights, the brand badge, and one accent stroke. Pine green is a
  quiet secondary accent (subtle backgrounds, "case study" callouts). Three
  full ramps (Yellow, Pine, Neutral) plus Green/Red/Blue status triads. Warm
  neutrals (browned greys), never cold blue-greys.
- **Type.** Three families with clear jobs:
  - **Wulkan Display** (serif, Bold) — all editorial **headings**. High-contrast,
    elegant.
  - **Satoshi** (sans) — **body, UI, and display**. Black weight for big impact
    numbers ("Digital First", "247%"); Medium/Bold for UI; Regular for long body.
  - **JetBrains Mono** — small **data labels / eyebrows / code**.
  - Headings are tight-tracked; eyebrows are uppercase +2px tracking.
- **Spacing.** 8px base unit, named scale `Spacing/025…1800` (2px → 144px).
  Generous section padding (64px frames), 24–40px stack gaps.
- **Backgrounds.** Flat fills only — off-white pages, white cards, ink panels,
  occasional pine-subtle or yellow-subtle wells and full-width section bands
  (`#EAE8E0` between frames). **No gradients, no textures, no photographic
  noise, no illustration backgrounds.** Imagery (when used) is clean and
  product/result-focused.
- **Corner radii.** Soft but restrained: inputs/cards ~12–16px; buttons are
  **fully pill-rounded** (`radius-full`); badges/tags pill. Nothing sharp-cornered,
  nothing over-rounded except pills.
- **Cards.** White fill, 1px subtle border (`#D1CDC7`) **or** a soft low shadow
  (`shadow-sm`/`md`) — not both heavy. 16px radius, 24px padding. A "case study"
  card uses a yellow border + pine accent text. No colored-left-border cards.
- **Borders.** 1px hairlines in `--border-subtle` for dividers and input rests;
  ink `--border-strong` for emphasis; yellow for brand framing.
- **Shadows.** Soft, low, **warm** (ink-tinted `rgba(25,19,13,…)`), never black,
  never large blurry drop shadows. Four steps xs→lg.
- **Hover states.** Primary button **inverts** (yellow→ink, ink text→off-white) —
  the signature interaction. Secondary darkens (ink→neutral-700). Tertiary fills
  with `neutral-100`. Links underline. Subtle 120–160ms ease transitions.
- **Press states.** Slight scale-down (~0.98) + settle; no color flash.
- **Disabled.** Reduced-tint fill (yellow-100 / neutral-300) + muted text, no
  pointer.
- **Focus.** 3px soft yellow ring (`--shadow-focus`), never a hard blue outline.
- **Animation.** Restrained and functional — fades and short eases
  (cubic-bezier ~0.2,0,0,1), 120–200ms. No bounces, no parallax, no looping
  decoration.
- **Transparency / blur.** Used sparingly — e.g. a translucent sticky header over
  off-white. Not a core motif.
- **Layout.** 1200px content max; 64px section gutters; left-aligned editorial
  grids. Generous whitespace is the point.

---

## Iconography

See **ICONOGRAPHY** below and the live cards in the Design System tab.

- The Figma file ships **no icon set of its own** — icons in the comps are
  simple line glyphs (an arrow on "READ MORE →", a trend-up on a stat, a star on
  the brand-identity card).
- **System: [Lucide](https://lucide.dev)** (CDN) — a clean, consistent 1.5–2px
  line set that matches the flat, editorial feel. This is a **substitution**
  flagged to the user (no bespoke icon font existed in the file). Swap for a
  custom set if Olifant adopts one.
- Stroke style: **outline, ~2px, round caps/joins**, currentColor — never
  filled, never duotone, never multicolor.
- **No emoji and no unicode-glyph icons** in brand surfaces.
- The **elephant mark** is the one brandmark — used as logo, favicon, and on its
  own as a quiet motif. Recolored variants live in `assets/`.

---

## Index / manifest

**Root**
- `styles.css` — global entry (import list only)
- `readme.md` — this file
- `SKILL.md` — Agent-Skill wrapper

**`tokens/`** — `fonts.css`, `colors.css`, `spacing.css`, `typography.css`, `base.css`

**`assets/`** — `logo-full.png`, `logo-mark.png` (+ `-white` / `-yellow` recolors)

**`components/`** (reusable primitives — `window.OlifantDigital.*`)
- `forms/` — Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch
- `display/` — Card, StatCard, Badge, Tag, Avatar
- `navigation/` — Tabs
- `feedback/` — Dialog, Toast, Tooltip

**`guidelines/`** — foundation specimen cards (Type, Colors, Spacing, Brand)

> **Scope note:** `ui_kits/` (website, dashboard), `slides/`, and
> `templates/presentation/` were removed in V2.2 — this build is for blog
> graphic content only. Blog templates are authored against
> `Claude-Blog-Content-Template.fig`.
