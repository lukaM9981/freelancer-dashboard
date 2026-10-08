# Olifant Workboard — Design

How the Olifant Digital design system is applied to this application. Product behaviour
lives in [PRD.md](./PRD.md); this document covers only how things look and feel.

**Source.** Olifant Digital Design System V2.2, exported from Claude Design and kept
unchanged in `design-system/`. V2.2 is scoped to blog and social graphics: its web and
dashboard UI kits were removed, but the foundations — colour, type, spacing, radius,
elevation, and seventeen base components — are complete. This document adapts those
foundations to an application UI. Where the design system is silent, the patterns here are
the decision. Where this document departs from the design system, it says so and why
(mostly accessibility, §3.1 and §3.7).

## 1. Files

| Path                               | What it is                                                         |
| ---------------------------------- | ------------------------------------------------------------------ |
| `design-system/`                   | The original export. Reference only, never imported                |
| `app/globals.css`                  | Tailwind v4 theme: brand palette, type scale, radii, shadows, shadcn variables, utilities |
| `app/fonts.ts`                     | `next/font` setup for Satoshi, Wulkan Display, JetBrains Mono      |
| `app/fonts/*.woff2`                | Brand fonts converted from the export's TTF files (about 70% smaller) |
| `app/icon.png`, `app/apple-icon.png` | Favicon and home-screen icon: the elephant mark on brand yellow  |
| `public/brand/`                    | Logos trimmed of padding: full logo and mark, in ink, white, yellow |
| `.cursor/rules/design-system.mdc`  | The short version of this document for Cursor                      |
| `.cursor/rules/project-docs.mdc`   | Tells Cursor to work from `docs/`                                  |

## 2. Setup

1. **shadcn.** Keep the `base-nova` preset. In `components.json` set
   `"iconLibrary": "lucide"` and install `lucide-react`. The design system specifies Lucide;
   do not carry Remix Icon over from earlier projects.
2. **Styles.** Replace `app/globals.css` with the one from this kit. If `shadcn init` added
   import lines beyond `tailwindcss` and `tw-animate-css`, keep them under those two.
3. **Fonts.** In `app/layout.tsx`:

   ```tsx
   import { fontVariables } from "./fonts";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" className={fontVariables}>
         <body>{children}</body>
       </html>
     );
   }
   ```

4. **Light only.** Do not install a theme provider. The shadcn `sonner` wrapper imports
   `useTheme` from `next-themes`; remove that and pass `theme="light"`.
5. **Never import from `design-system/`.** Its components are inline-styled prototypes. The
   app rebuilds them on shadcn as described in §4, so every component gets accessibility,
   keyboard handling, and Tailwind classes for free.

## 3. Tokens

### 3.1 Colour

The theme exposes only design-system colours. Tailwind's default palette is switched off,
so `bg-gray-100` or `text-blue-500` generate nothing — a mistake shows up immediately as
missing colour instead of silently going off-brand.

**Ramps available as classes:** `yellow-50…950`, `pine-50…950`, `neutral-50…950`,
`green-50/200/500/700`, `red-50/200/600`, `blue-100/700`, `white`, `black`.

**shadcn variables**

| Variable                         | Token                    | Used for                                         |
| -------------------------------- | ------------------------ | ------------------------------------------------ |
| `background`                     | neutral-50 `#FFFEF9`     | Page canvas (off-white)                          |
| `foreground`                     | neutral-900 `#19130D`    | Text (ink)                                       |
| `card`, `popover`                | white                    | Raised surfaces                                  |
| `primary` / `-foreground`        | yellow-400 / neutral-900 | The one primary action, brand highlights         |
| `secondary` / `-foreground`      | neutral-900 / neutral-50 | Ink button, ink panels (the design system's "secondary") |
| `muted` / `-foreground`          | neutral-100 / neutral-500 | Wells, section bands, secondary text            |
| `accent` / `-foreground`         | neutral-100 / neutral-900 | Hover surface of menu items and ghost buttons   |
| `destructive`                    | red-600                  | Destructive actions and errors                   |
| `border`, `input`                | neutral-200              | Hairlines, field borders                         |
| `ring`                           | yellow-500               | The soft focus halo inside shadcn components     |

**Name clash.** The design system's "accent" is pine green. shadcn's `accent` is the hover
surface. In this app, `accent` means the shadcn meaning; pine is used through `pine-*`
classes.

**Olifant tokens** (also in `globals.css`): `ink`, `brand`, `brand-subtle`, `link`,
`scrim`, `success`/`-subtle`/`-border`, `error`/`-subtle`/`-border`, `info`/`-subtle`, and
the four `meter-*` colours (§5.2).

**How colour is used**

- Off-white canvas, white cards, ink text. Warm greys only.
- Yellow does the talking, sparingly: the primary button, the active tab rule, brand
  badges, the dot on the running timer. Nothing decorative.
- Pine is the quiet secondary accent: approved work, avatars, subtle wells.
- Green, red, and blue carry status only, always with an icon and a label.

**Measured contrast and the resulting rules**

| Pair                                        | Ratio  | Rule                                                    |
| ------------------------------------------- | ------ | ------------------------------------------------------- |
| Ink on page                                 | 18.2:1 | Body text                                               |
| neutral-500 on page / white / neutral-100   | 5.5 / 5.6 / 4.9:1 | `muted-foreground` is safe for secondary text |
| neutral-400 on page                         | 2.8:1  | Placeholders and disabled text only                     |
| yellow-700 on page (design system link)     | 4.3:1  | Fails 4.5:1 — links use **yellow-800** (7.9:1) instead  |
| Ink on yellow-400                           | 12.6:1 | Primary button                                          |
| White on red-600                            | 4.5:1  | Destructive button                                      |
| green-700 on green-50                       | 4.0:1  | Fails for small text — success badges use ink text and a green icon |
| red-600 on red-50                           | 4.4:1  | Fails for small text — error badges use ink text and a red icon |
| blue-700 on blue-100                        | 5.6:1  | Info badge as designed                                  |
| yellow-800 on yellow-100                    | 6.8:1  | Brand badge as designed                                 |
| pine-700 on pine-100                        | 5.8:1  | Pine badge as designed                                  |
| Yellow halo on page                         | 1.2–1.6:1 | Not a visible focus indicator on its own (§3.7)      |
| neutral-200 field border on white           | 1.6:1  | Design-system choice, kept; fields always have a visible label |

**Known issues in the design system** (raise with Olifant, do not fix silently):

- `pine-400` is `#8E857D`, a grey that breaks the pine ramp — most likely a slip in the
  Figma file. Do not use it.
- `--text-link` (yellow-700) fails text contrast; see above.
- The status triads are partial: green has 50/200/500/700, red 50/200/600, blue 100/700.
  Do not invent the missing steps.

### 3.2 Typography

| Family          | Role in the app                                                        | Class          |
| --------------- | ---------------------------------------------------------------------- | -------------- |
| Wulkan Display  | Headings `h1`–`h4`, dialog titles, primary and secondary button labels | `font-heading` |
| Satoshi         | Everything else: body, UI, labels, numbers                             | `font-sans`    |
| JetBrains Mono  | Timer clock, IDs, timestamps, code                                     | `font-mono`    |

| Token            | Size / line | Class               | Use in the app                                   |
| ---------------- | ----------- | ------------------- | ------------------------------------------------ |
| Heading lg       | 32 / 40     | `text-heading-lg`   | Page title (`h1`), desktop                       |
| Heading md       | 26 / 32     | `text-heading-md`   | Page title on phones, dialog title               |
| Heading xs       | 20 / 24     | `text-heading-xs`   | Card and section titles (`h2`, `h3`)             |
| Display stat     | 48 / 48     | `text-display-stat` | StatCard value, Satoshi Black                    |
| Display lg       | 32 / 44     | `text-display-lg`   | Compact stat values, totals                      |
| Body sm          | 16 / 24     | `text-body-sm`      | Default body and form controls                   |
| Body xs          | 14 / 18     | `text-body-xs`      | Tables, lists, field labels, menu items          |
| Caption          | 13 / 18     | `text-caption`      | Badges, helper and error text, tooltips          |
| Eyebrow          | 12 / 12     | `eyebrow` utility   | Table headers, context above page titles         |
| Mono             | 13 / 20     | `text-mono`         | IDs and timestamps; the timer clock uses body sizes in mono |

The larger design-system sizes (`heading-xl`, `heading-xxl`, `display-xl`, `body-md` and
up) exist in the theme but are for marketing surfaces; the app rarely needs them.

Rules:

- Headings are tight-tracked and use lining numerals (Wulkan defaults to old-style figures,
  which look wrong next to data).
- All numbers that can line up — durations, money, counts in tables — get the `numeric`
  utility (Satoshi's tabular figures).
- Eyebrows are uppercase with 2px tracking, set by the utility; write the text in normal
  case in code.

### 3.3 Spacing

The design system's 8px scale lines up exactly with Tailwind's 4px steps, so Tailwind's
spacing classes are used as they are.

| Design system | px  | Tailwind | Typical use                         |
| ------------- | --- | -------- | ----------------------------------- |
| 050           | 4   | `1`      | Icon to text inside badges          |
| 100           | 8   | `2`      | Icon to text in buttons, tight gaps |
| 150           | 12  | `3`      | Button groups, list item padding    |
| 200           | 16  | `4`      | Form field gaps, mobile gutter      |
| 300           | 24  | `6`      | Card padding, gaps between cards    |
| 400           | 32  | `8`      | Between page sections, desktop gutter |
| 500           | 40  | `10`     | Between major groups                |
| 800           | 64  | `16`     | Large empty-state padding           |

### 3.4 Radius

| Class          | px   | Used for                                        |
| -------------- | ---- | ----------------------------------------------- |
| `rounded-xs`   | 4    | Checkbox                                        |
| `rounded-sm`   | 8    | Inputs, textareas, select triggers, menu items, tooltips |
| `rounded-md`   | 12   | Menus, popovers, toasts                         |
| `rounded-lg`   | 16   | Cards, dialogs, sheets                          |
| `rounded-full` | pill | Buttons, icon buttons, badges, tags, avatars, the timer bar |

These replace shadcn's `calc(var(--radius) …)` scale. Generated components may use other
radius classes; change them to the values above.

### 3.5 Elevation

Warm, low shadows only; Tailwind's default (black) shadows are switched off.

| Class       | Used for                                     |
| ----------- | -------------------------------------------- |
| `shadow-xs` | Subtle lift on inputs when needed            |
| `shadow-sm` | Switch thumb, hovered cards                  |
| `shadow-md` | Menus, popovers, toasts, tooltips, elevated cards |
| `shadow-lg` | Dialogs and sheets                           |

A card has a hairline border **or** a shadow, never both heavy.

### 3.6 Motion

120–200ms with `ease-brand` (`cubic-bezier(0.2, 0, 0, 1)`), for example
`transition-colors duration-150 ease-brand`. Buttons scale to 0.98 when pressed. Fades and
short eases only: no bounce, no parallax, no looping animation. The only thing that moves
continuously is the timer's elapsed time. `prefers-reduced-motion` turns transitions off
globally.

### 3.7 Focus

The design system's focus style is a 3px soft yellow halo. On its own it measures 1.2–1.6:1
against the page, which fails the 3:1 requirement for focus indicators. Two utilities in
`globals.css` resolve this:

- **`focus-ring`** — buttons, links, tabs, toggles, clickable rows. A 2px ink outline,
  offset 2px, with the yellow halo outside it. Keeps the brand look and is clearly visible.
- **`focus-field`** — inputs, textareas, select triggers. Ink border plus the 3px yellow
  halo, exactly as the design system specifies; the ink border carries the contrast.

Do not combine `focus-ring` with Tailwind `ring-*` classes on the same element; both use
`box-shadow`.

### 3.8 Layout

- Content width `max-w-content` (1200px), centred.
- Page padding: `px-4 py-6` on phones, `md:px-6`, `lg:px-8 lg:py-8`.
- Tailwind's default breakpoints. The sidebar appears from `lg` (1024px); below that it is
  a sheet behind a menu button.

## 4. Components

The app uses shadcn components, restyled to the specifications below. The "Design system"
column names the original component in `design-system/components/` for visual reference.

### 4.1 Button

| Olifant name | shadcn variant | Design system   | Classes                                                                                                   |
| ------------ | -------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| Primary      | `default`      | Button primary  | `bg-primary text-primary-foreground font-heading font-bold hover:bg-secondary hover:text-secondary-foreground` |
| Secondary    | `secondary`    | Button secondary | `bg-secondary text-secondary-foreground font-heading font-bold hover:bg-neutral-700`                     |
| Tertiary     | `outline`      | Button tertiary | `bg-transparent text-foreground border-[1.5px] border-foreground font-sans font-bold uppercase tracking-wide hover:bg-muted` |
| Ghost        | `ghost`        | IconButton ghost | `bg-transparent text-foreground font-sans font-medium hover:bg-accent`                                   |
| Destructive  | `destructive`  | —               | `bg-destructive text-destructive-foreground font-heading font-bold hover:bg-destructive/90`               |
| Link         | `link`         | —               | `text-link font-medium underline-offset-4 hover:underline`                                                |

All variants: `rounded-full focus-ring transition-colors duration-150 ease-brand
active:scale-[0.98] disabled:pointer-events-none`. Disabled primary uses `bg-yellow-100
text-neutral-400`; disabled secondary `bg-neutral-300 text-neutral-100`.

The hover on the primary button — yellow inverting to ink — is the design system's
signature interaction. Keep it.

| Size      | Height | Classes                         | Text                                   |
| --------- | ------ | ------------------------------- | -------------------------------------- |
| `sm`      | 32     | `h-8 px-4 gap-1.5`              | `text-body-xs` (tertiary: `text-caption`) |
| `default` | 40     | `h-10 px-5 gap-2`               | `text-body-sm` (tertiary: `text-body-xs`) |
| `lg`      | 48     | `h-12 px-7 gap-2.5`             | `text-body-md` (tertiary: `text-body-sm`) |
| `icon`    | 40     | `size-10` (`size-8`, `size-12`) | Icon 18–20px                           |

These sizes are one step denser than the design system's marketing buttons, which suits an
application. Rules: one primary button per view; a loading button keeps its width and shows
a spinner in place of the label; icon buttons always have an `aria-label` and a tooltip.

### 4.2 Form controls

**Input, Textarea, Select trigger**: `h-10 rounded-sm border-[1.5px] border-input bg-white
px-4 text-body-sm placeholder:text-neutral-400 focus-field
aria-invalid:border-destructive disabled:bg-muted disabled:opacity-60`. Textarea uses
`py-3` and `min-h-24` instead of a fixed height.

**Label**: above the field, `text-body-xs font-medium`. Optionally `text-pine-700` while the
field has focus (`group-focus-within:`), as in the design system.

**Helper text**: `text-caption text-muted-foreground`. **Error text**: `text-caption
text-destructive` with a 14px `triangle-alert` icon.

**Checkbox**: 20px, `rounded-xs`, border 1.5px `neutral-600`; checked fills `bg-primary`
with an ink check. **Radio**: 20px circle, border 1.5px `neutral-600`; selected shows an ink
ring and a 10px ink dot. **Switch**: 44×24, off `bg-neutral-300`, on `bg-pine-600`, white
thumb with `shadow-sm`.

**Duration input** (custom, `components/duration-input.tsx`): accepts `1:30`, `1h 30m`,
`90m`, or `1.5` and stores whole minutes; shows the parsed value as a caption ("= 1h 30m").
A bare number is hours, the way a timesheet reads it: `10` is 10h and `10:30` is 10h 30m.
For estimates and extra hours it snaps to the nearest 15-minute step and says so in the
helper text.

### 4.3 Surfaces

**Card**: `bg-card rounded-lg border border-border p-6`, or `shadow-md` instead of the
border for floating cards. Title `h2`/`h3` in `text-heading-xs`. Variants:

| Variant  | Classes                                              | Use                                   |
| -------- | ---------------------------------------------------- | ------------------------------------- |
| Default  | `bg-card border border-border`                       | Almost everything                     |
| Subtle   | `bg-muted` (no border)                               | Wells, secondary information          |
| Inverse  | `bg-secondary text-secondary-foreground`             | The running timer, rare emphasis      |
| Brand    | `bg-card ring-[1.5px] ring-inset ring-primary`       | At most one per screen: "Waiting for a decision" on the Admin dashboard |

**StatCard** (custom, `components/stat-card.tsx`): Card default, `p-6 flex flex-col gap-2`.
Value `text-display-stat font-black numeric tracking-tight`; label `text-body-sm
text-muted-foreground`; optional trend `text-caption` with a `trending-up`/`trending-down`
icon. Money stat cards show one value per currency, stacked.

**Dialog / Alert dialog**: overlay `bg-scrim`; content `bg-card rounded-lg shadow-lg p-7
max-w-[480px]`; title `font-heading text-heading-md`; description `text-body-sm
text-muted-foreground`; footer right-aligned, `gap-3`, primary action last. **Sheet**: same
surface, `rounded-none` on the attached edge.

**Menus, popovers, select content, command**: `bg-popover rounded-md border border-border
shadow-md p-1`; items `rounded-sm px-3 py-2 text-body-xs`, highlighted `bg-accent`.

**Tooltip**: `bg-secondary text-secondary-foreground text-caption font-medium px-2.5 py-1.5
rounded-sm shadow-md`.

**Toast (sonner)**: white, `rounded-md shadow-md`, a 3px left accent in the status colour
(the one place a coloured left edge is allowed, per the design system), status icon, title
`text-body-xs font-bold`, message `text-body-xs text-muted-foreground`. Pass these through
the Toaster's `toastOptions.classNames`.

### 4.4 Data display

**Badge**: pill, `inline-flex items-center gap-1 px-3 py-1 text-caption font-medium`, icon
14px (`sm`: `px-2 py-0.5 text-xs`, icon 12px). Variants follow the design system: default (`bg-muted
text-muted-foreground`), brand (`bg-yellow-100 text-yellow-800`), accent (`bg-pine-100
text-pine-700`), info (`bg-info-subtle text-info`), and success/error with ink text as
noted in §3.1. Task statuses use `StatusBadge` (§5.1).

**Tag**: pill chip, `bg-white ring-1 ring-inset ring-border px-3 py-1 text-body-xs
font-medium`, optional remove button.

**Avatar**: circle, initials in `bg-pine-200 text-pine-800 font-bold`; sizes 24/32/40/56/72.
Only ever shown to Admins for other people (freelancers never see each other).

**Tabs**: underline style, not shadcn's segmented default. List `border-b border-border
gap-1`; trigger `px-4 py-2.5 text-body-xs font-medium text-muted-foreground -mb-px
border-b-2 border-transparent focus-ring`; active `text-foreground font-bold
border-primary`.

**Table**: header cells use the `eyebrow` utility, `h-10`, `border-b border-border`; body
rows `h-12 border-b border-border text-body-xs hover:bg-muted/50`; numeric columns
right-aligned with `numeric`; the first column `font-medium`. Below `md`, tables turn into
stacked list rows (one card-like row per record) instead of scrolling sideways.

**Skeleton**: static `bg-muted rounded-sm` blocks, no shimmer.

**Sidebar**: `bg-sidebar border-r border-sidebar-border w-62`; full logo at the top
(`public/brand/logo-full.png`, 32px high); items `h-9 rounded-sm px-3 gap-3 text-body-xs
font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-ring`;
active item `bg-sidebar-accent text-foreground font-bold`. Count badges (Approvals) use the
brand badge.

**Calendar / date picker**: selected day `bg-primary text-primary-foreground
rounded-full`, today `ring-1 ring-inset ring-foreground`, weeks start on Monday.

## 5. App patterns

### 5.1 Task status

`components/status-badge.tsx` renders every task status as label + icon + colour. The
colour logic: **yellow means Olifant needs to act**, yellow outline means the freelancer
needs to act, pine and blue mean work is moving, and final states are green, red, or grey.

| Status            | Look                    | Classes                                                         | Icon (Lucide)   |
| ----------------- | ----------------------- | --------------------------------------------------------------- | --------------- |
| Draft             | Neutral outline         | `bg-white text-foreground ring-1 ring-inset ring-border`        | `circle-dashed` |
| Pending approval  | Brand                   | `bg-yellow-100 text-yellow-800`                                 | `clock`         |
| Changes requested | Brand outline           | `bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-300` | `rotate-ccw`   |
| Approved          | Pine                    | `bg-pine-100 text-pine-700`                                     | `circle-check`  |
| In progress       | Info                    | `bg-info-subtle text-info`                                      | `timer`         |
| On hold           | Neutral                 | `bg-muted text-neutral-600`                                     | `circle-pause`  |
| Done              | Brand                   | `bg-yellow-100 text-yellow-800`                                 | `flag`          |
| Accepted          | Success                 | `bg-success-subtle text-foreground ring-1 ring-inset ring-success-border`, icon `text-success` | `badge-check` |
| Rejected          | Error                   | `bg-error-subtle text-foreground ring-1 ring-inset ring-error-border`, icon `text-error` | `circle-x` |
| Cancelled         | Neutral, muted          | `bg-muted text-muted-foreground`                                | `ban`           |

The same component covers related states: extra-hours requests (pending = brand, approved
= pine, rejected = error), proposal items (as tasks), and months (open = neutral outline
with `lock-open`, closed = `bg-secondary text-secondary-foreground` with `lock`).

### 5.2 Hours meter

`components/hours-meter.tsx` shows counted time against a task's limit and ceiling.

- Track: `h-2 rounded-full bg-meter-track`. The bar's full width is the larger of the
  ceiling and the counted time, so over-limit time is always visible.
- Segments, separated by a 2px gap: counted time up to the limit in `bg-meter-counted`
  (ink), time in the tolerance zone in `bg-meter-tolerance` (yellow-500), over-limit time in
  `bg-meter-over` (red-600). Segment ends are rounded.
- A 2px ink tick marks the limit and extends slightly above and below the track.
- A text line under the bar always states the situation, so meaning never depends on
  colour (the yellow segment is only 1.5:1 against the track):

| State                 | Text                                               | Icon             |
| --------------------- | -------------------------------------------------- | ---------------- |
| Under 80%             | `5h 12m of 8h · 2h 48m left`                       | —                |
| 80% to the limit      | `6h 40m of 8h · 1h 20m left`, in `text-yellow-800` | `triangle-alert` |
| In the tolerance zone | `8h 30m of 8h · 18m tolerance left`                | `triangle-alert` |
| Over limit            | `42m over limit — Request Extra Hours` (link)      | `circle-alert`, `text-error` |

### 5.3 Formatting numbers, time, and money

Parsing and formatting live in `lib/duration.ts`, `lib/money.ts`, and `lib/dates.ts`.
`lib/format.ts` re-exports them, which is what screens import. Never format inline.

| What                   | Format                                      | Example                    |
| ---------------------- | ------------------------------------------- | -------------------------- |
| Duration               | Hours and minutes, zero parts omitted       | `8h 48m`, `45m`, `12h`, `0m` |
| Estimate range         | Decimal hours with an en dash               | `4–8 h`, `2.5–3.75 h`      |
| Timer clock            | `HH:MM:SS`, `font-mono numeric`             | `01:23:45`                 |
| Money                  | Symbol, thousands separator, two decimals   | `€1,240.00`, `$300.00`     |
| Money in two currencies | Separate values, never a sum               | `€1,240.00 · $300.00`      |
| Date                   | Day, short month, year                      | `6 Oct 2026`               |
| Date and time          | 24-hour clock                               | `6 Oct 2026, 14:05`        |
| Relative (feeds only)  | Short                                       | `3h ago`, `yesterday`      |
| Percent                | Whole number                                | `80%`                      |

Dates and times are always computed in the organization's time zone. CSV exports use ISO
dates and decimal hours.

### 5.4 Timer

**Timer bar** (visible on every screen while a timer runs): in the top bar on desktop,
fixed above the bottom edge on phones. `bg-secondary text-secondary-foreground
rounded-full h-10 pl-4 pr-1 flex items-center gap-3 shadow-md`. From left to right: an 8px
`bg-primary` dot (static, it does not pulse), the project as an eyebrow in
`text-neutral-300`, the task title (truncated), the elapsed time in `font-mono numeric`,
and a primary icon button with a `square` icon labelled "Stop timer".

**After ten hours** a `text-primary` caption "Running over 10h" with `triangle-alert`
appears in the bar.

**Starting**: tertiary icon buttons with a `play` icon labelled "Start timer" on task rows,
the task detail, My time, and the freelancer dashboard. On the task detail, the start
button is the page's primary action.

**Review dialog** (on stop): task and project, start and end time (editable), duration,
required description, then "Save Time" (primary) and "Discard" (ghost, with a confirm).
A run that crosses midnight adds date inputs and lists the split per day. After ten hours
the dialog shows a warning box (`border-yellow-300 bg-yellow-50`, `triangle-alert` in
`text-yellow-800`) and a required "The end time is correct" checkbox.

**Screen readers**: announce start and stop through a polite live region; the ticking
clock itself is not announced.

### 5.5 App shell and page layout

- **Sidebar** (from `lg`): logo; Dashboard, Approvals (Admin, count badge), Projects, My
  time (freelancers; their own entries), Reports, then for Admins Months, People, Audit
  log, Settings; the profile menu at the bottom.
- **Top bar**: menu button (below `lg`), the timer bar, the notification bell (ghost icon
  button with a brand count badge).
- **Page header**: an `eyebrow` with the context (for example the project name), the `h1`,
  and at most one primary action on the right. On phones the action moves under the title,
  full width.
- **Content**: `mx-auto max-w-content`, sections `space-y-8`, cards in grids with `gap-6`.

### 5.6 Dashboards and charts

- Lead with numbers: a row of StatCards (two per row on phones, four on desktop), then
  lists and tables. Charts only where a trend or comparison really needs one.
- **Chart colours** (validated for colour-vision deficiency and contrast against white
  cards and the page): series 1 `chart-1` (yellow-700 `#997300`), series 2 `chart-2`
  (blue-700 `#0052B4`). The brand ramps cannot supply a third series colour that passes, so
  charts have at most two series; more than two means a table, small multiples, or an
  "Other" group. A single series always uses `chart-1`.
- **Magnitude** (for example a heatmap of time by day) uses the yellow ramp from 600 to
  900, light to dark; the lighter yellows are too faint on white.
- Status colours (green, red, the meter colours) never stand in for a series.
- Marks: bars with 4px rounded ends and 2px gaps, 2px lines, `neutral-200` grid lines,
  axis labels `text-caption text-muted-foreground`, a tooltip on hover, and a table view
  for every chart.

### 5.7 Forms

One column; labels above fields; `gap-4` between fields and `gap-8` between sections.
Actions at the bottom, right-aligned, primary last; on phones stacked full width with the
primary on top. Validate on submit, then on change. Estimates are two duration inputs
(minimum, maximum) separated by an en dash, with the helper text "In 15-minute steps".

### 5.8 Approvals

The inbox lists proposals as cards: the freelancer's avatar and name, the project as an
eyebrow, item count, the total range, the cost range, and the age. The proposal detail is a
table of items, each with tertiary icon buttons for approve (`check`), request changes
(`rotate-ccw`), and reject (`x`). "Approve All Remaining" is the page's single primary
action. Rejecting and requesting changes open a dialog with a required comment.

### 5.9 Empty, loading, and error states

- **Empty**: the elephant mark (`public/brand/logo-mark.png`, 64px wide), a `text-heading-xs`
  line, one sentence in `text-muted-foreground`, and at most one action. For example:
  "Nothing waiting for you" / "New proposals from freelancers will show up here."
- **Loading**: static skeletons in the shape of the content.
- **Errors**: inline next to the cause when possible; otherwise a toast for actions, and
  `error.tsx` with a heading, one sentence, and a "Try Again" button for pages.

## 6. Copy

- English, plain, short. Numbers carry the message.
- Headings and labels in sentence case ("Waiting for a decision", "My time"). Buttons in
  Title Case ("Submit Proposal", "Approve All Remaining"). Tertiary buttons and eyebrows are
  uppercased by their classes; write them in normal case in code.
- No emoji, no exclamation marks.
- Use the exact status and feature names from the PRD: Pending approval, Changes
  requested, extra-hours request, over limit, month closed.
- Errors say what happened and what to do: "This month is closed. Time can't be added to a
  closed month."

## 7. Checklist for every screen

- Only theme tokens and brand ramps; nothing from Tailwind's default palette.
- At most one primary (yellow) button.
- Headings in Wulkan, everything else in Satoshi; numbers `numeric`.
- Status shown with label and icon, never colour alone.
- Every interactive element has a visible focus state (`focus-ring` / `focus-field`).
- Icon-only buttons have an `aria-label` and a tooltip.
- Works at 360px wide: no sideways scrolling, tables become rows, actions stack.
- Freelancer views show nothing about other freelancers.
