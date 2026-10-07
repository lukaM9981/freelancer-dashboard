---
name: olifant-digital-design
description: Use this skill to generate well-branded blog & social graphic content for Olifant Digital (a full-service Amazon & e-commerce marketing agency). Contains essential design guidelines, colors, type, fonts, logos, and reusable components for on-brand blog graphics.
user-invocable: true
---

# Olifant Digital — Design System

Read **`readme.md`** first — it carries the full brand context, content
fundamentals (voice, casing, no-emoji rule), visual foundations, and
iconography. Then explore:

- **`styles.css`** — the single global entry point. Link this one file and every
  token + font is available. It `@import`s `tokens/` (`colors.css`,
  `spacing.css`, `typography.css`, `fonts.css`, `base.css`).
- **`tokens/`** — CSS custom properties: full Yellow / Pine / Neutral ramps,
  semantic status triads, the 8px spacing scale, type scale, radii, warm ink
  shadows. Use `var(--…)` tokens; don't invent colors.
- **`components/`** — reusable React primitives (Button, IconButton, Input,
  Textarea, Select, Checkbox, Radio, Switch, Card, StatCard, Badge, Tag, Avatar,
  Tabs, Dialog, Toast, Tooltip). Each has a `.d.ts` contract and `.prompt.md`
  usage note. Exposed on `window.OlifantDigitalDesignSystem_8e3542` via the
  compiled `_ds_bundle.js`.
- **`guidelines/`** — foundation specimen cards (colors, type, spacing, brand).

> **Scope (V2.2):** this build is for **blog & social graphic content only**.
> Blog templates are authored against `Claude-Blog-Content-Template.fig`.
> Presentation/deck and web/UI-kit templates were removed.
- **`assets/`** — logos (`logo-full`, `logo-mark`, each + `-white` / `-yellow`).

## How to use

**Blog & social graphics:** copy the assets you need out, link `styles.css` (or
inline the token values), and produce static HTML for the user to view. Follow
`Claude-Blog-Content-Template.fig` for blog graphic layout.

**Production code:** copy assets and follow the rules here to design as an expert
in the brand. To use the React components, load `_ds_bundle.js` and read from
`window.OlifantDigitalDesignSystem_8e3542`.

If invoked with no other guidance, ask what the user wants to build, ask a few
focused questions, then act as an expert designer who outputs HTML artifacts
**or** production code depending on the need.

## Non-negotiables

- Yellow `#FFD046` is the single hero accent — used sparingly. Ink text on it.
- Headlines = Wulkan Display serif; body/UI/display = Satoshi; data = JetBrains Mono.
- Flat fills only. No gradients, no textures, no emoji, no hand-drawn SVG icons.
- Icons = Lucide (outline, ~2px). Cards = white + hairline *or* soft warm shadow.
- Voice: confident, plain-spoken, results-led. "We" → "you". Eyebrows ALL-CAPS.

## Fonts

Satoshi and **Wulkan Display Bold** are self-hosted in `assets/fonts/`;
JetBrains Mono loads from Google Fonts. All three are the real brand faces.
See `tokens/fonts.css`.
