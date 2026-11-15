# Design handoff → codebase implementation map

Source spec: `docs/design/handoff/HANDOFF.md`, `docs/design/handoff/screens/*.dc.html`, `docs/design/handoff/canvas.json`.
Target: this repo (Next.js 16 App Router, React 19, Tailwind 4, Base UI, Vitest + Testing Library).

All values below are lifted from the inline styles in the screen markup. Where markup and HANDOFF.md disagree, this map says so and picks one (see §6).

> **For data shapes, status names, and API routes, `docs/plan/backend-requirements.md` wins over this map** (e.g. `draft_abandoned` / `prompt_unused`, not `abandoned_draft` / `unused_prompt`). For tooling and token names, ticket specs in `docs/plan/tickets/` are final. Where a design gap here has been decided by a ticket, the ticket wins.

Product decisions already made by the owner (they override the mockups where they conflict):

- Feedback and tutor language is French. Louisiana French is preferred; Standard French is acceptable.
- Standard French is never wrong. It gets a Standard→Louisiana suggestion that never counts as a Mistake.
- Spelling authority is the Dictionary of Louisiana French (DLF), `../DLF-extract/out/canonical.jsonl`.
- CEFR, the Placement Test, and the 3/day quota stay. The quota resets at local midnight.
- Resources come from a curated catalog (general French grammar + comprehensible-input sources), picked per category, not per Mistake.

Vocabulary: domain terms follow `CONTEXT.md`. New terms introduced by the handoff that `CONTEXT.md` does not define yet: **Correction** (and its three kinds: Mistake, Standard→Louisiana, Dialect check), **Weakness**, **Focus du jour** (Focus), **Dialect Note**, **Resource**, **Draft**, **Carnet**. Add them to `CONTEXT.md` before building (see §6).

---

## 1. Design tokens

### 1.1 `src/app/layout.tsx` — fonts and root

Replace Geist / Geist_Mono with:

```tsx
import { Bricolage_Grotesque, Newsreader } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],          // handoff loads opsz 12..96; weight omitted → variable 200–800
  variable: "--font-bricolage",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],          // handoff loads opsz 6..72, wght 400/500, italic 400
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});
```

- `<html lang="fr" className={`${bricolage.variable} ${newsreader.variable} h-full antialiased`}>`. The UI is French; `lang="en"` today is wrong for screen readers and hyphenation.
- `metadata.title`: the wordmark is a placeholder (see §6). Until then use `"Lâche pas."`, with description `"atelier d'écriture · français louisianais"`.
- The layout should render `<AppHeader />` once, with the reduced variant on `/placement` (route group or layout prop, see §3).

### 1.2 `src/app/globals.css`: the `--font-sans` bug

Today:

```css
@theme inline {
  --font-sans: var(--font-sans);      /* self-referential → invalid at computed time → falls back to UA default */
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
```

`--font-sans: var(--font-sans)` is a cycle. CSS treats cyclic custom properties as *invalid at computed-value time*, so `font-sans` resolves to the browser default font, not Geist. (Geist was registered as `--font-geist-sans` and never wired up.) The fix is to point the theme font tokens at the `next/font` variables, which have different names:

```css
@theme inline {
  --font-sans: var(--font-bricolage), "Trebuchet MS", sans-serif;
  --font-serif: var(--font-newsreader), Georgia, serif;
}
```

`inline` is required here. The `next/font` variables are set by a class on `<html>`, and `inline` makes the utility emit the `var(--font-bricolage)` chain directly.

### 1.3 Tokens to remove

Remove everything that came from the shadcn `neutral` scaffold. None of it matches the design, and keeping it invites agents to use `bg-primary`/`text-muted-foreground` with the wrong colors:

- The whole `:root { … }` block (`--background`, `--foreground`, `--card*`, `--popover*`, `--primary*`, `--secondary*`, `--muted*`, `--accent*`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--radius`, `--sidebar*`).
- The whole `.dark { … }` block and `@custom-variant dark (&:is(.dark *));`. The design has no dark mode.
- In `@theme inline`: every `--color-*: var(--…)` alias, `--radius-sm … --radius-4xl` (derived from `--radius`), `--font-mono`, `--font-heading`.
- In `@layer base`: `@apply border-border outline-ring/50` and `@apply bg-background text-foreground` (they reference removed tokens).
- Keep `@import "tailwindcss";`, `@import "tw-animate-css";` (it can drive the sheet slide-in), and `@import "shadcn/tailwind.css";` (it only adds `data-open`/`data-checked`/… variants and accordion keyframes, which are useful with Base UI).

Consequence: `src/components/ui/button.tsx` uses `bg-primary text-primary-foreground border-border ring-ring bg-muted bg-destructive …`. It must be rewritten in the same change (see §2, `Button`). `primary` keeps its name with a new value, but `primary-foreground`, `ring`, `muted` (as a background), `destructive`, and `border` disappear.

### 1.4 Tokens to add

```css
@theme {
  /* Reset Tailwind's palette so only design colors exist (white/transparent/current kept) */
  --color-*: initial;
  --color-white: #FFFFFF;
  --color-transparent: transparent;
  --color-current: currentColor;

  /* Surfaces */
  --color-desk: #E6EBE6;            /* page background */
  --color-desk-highlight: #F3F6F1;  /* soft top-left glow */
  --color-sheet: #FCFDFA;           /* writing sheet, cards, side panel */
  --color-notice: #EEF2ED;          /* calm banners: quota, offline, incomplete data */

  /* Text */
  --color-ink: #17211D;             /* primary text */
  --color-ink-2: #3A4640;           /* secondary text on sheet; demoted prompt in review */
  --color-muted: #55625C;           /* labels, meta, captions */
  --color-disabled-text: #6B7770;   /* disabled controls; "unused prompt" dash glyph */

  /* Lines */
  --color-line: #D0D8D1;            /* sheet borders, dividers */
  --color-line-strong: #B9C4BC;     /* control borders, chip, notice border, inactive progress */
  --color-input-border: #8D9A92;    /* text inputs, secondary buttons in banners */
  --color-rule: #DCE3DD;            /* textarea ruled lines, meter track */

  /* Brand / actions */
  --color-primary: #1F5A4A;         /* primary buttons, links, Focus label, evaluated dot */
  --color-primary-hover: #123C31;
  --color-primary-tint: #E3EEE8;    /* selected level, advancement banner */
  --color-meter-target: #BCD3C8;    /* 250–300 zone on the meter */
  --color-busy: #2F4A40;            /* loading-state buttons; selected level caption */

  /* Correction kinds */
  --color-mistake: #A8321A;         /* also the wordmark full stop */
  --color-mistake-tint: #F7E1DA;
  --color-standard: #1F4E8C;        /* never a fill */
  --color-dialect: #7A5A00;
  --color-dialect-tint: #F6ECC8;

  /* Overlays */
  --color-scrim: rgb(23 33 29 / 0.42);

  /* Radii */
  --radius-base: 6px;               /* "6 px everywhere": use `rounded-base` */
  --radius-chip: 22px;              /* level chip pill, close button */
  --radius-marker: 9px;             /* in-text <sup> marker pills */
  --radius-marker-card: 10px;       /* marker pill in card header */
  --radius-marker-dialect: 3px;     /* squared dialect marker */
  --radius-meter: 3px;              /* meter track/fill */
  --radius-progress: 2px;           /* placement progress segments */

  /* Shadows */
  --shadow-sheet: 0 18px 40px -28px rgb(23 33 29 / 0.45);
  --shadow-panel: -24px 0 60px -30px rgb(23 33 29 / 0.6);   /* Dialect Note side panel */
  --shadow-pop: 0 14px 30px -22px rgb(23 33 29 / 0.5);      /* swap-prompt confirm */

  /* Max widths (use as max-w-prose-col etc.) */
  --container-home: 760px;          /* Home phases A/B, Placement */
  --container-list: 860px;          /* Carnet, History */
  --container-review: 1200px;       /* Home phase C split */
  --container-panel: 560px;         /* Dialect Note side panel width */

  /* Spacing: keep Tailwind's 4px base; every design value is a multiple of 2px → use .5 steps (p-5.5 = 22px) */
  --spacing: 0.25rem;
  --spacing-touch: 44px;            /* min touch target: min-h-touch */
  --spacing-btn: 48px;              /* primary button height */
  --spacing-btn-mobile: 54px;       /* full-width primary on mobile */
  --spacing-row: 68px;              /* History row min height */

  /* Type scale (size / line-height / tracking / weight) */
  --text-page-title: 46px;  --text-page-title--line-height: 1.05; --text-page-title--letter-spacing: -0.03em; --text-page-title--font-weight: 600;
  --text-page-title-sm: 38px; --text-page-title-sm--line-height: 1.05; --text-page-title-sm--letter-spacing: -0.03em; --text-page-title-sm--font-weight: 600; /* mobile Home date */
  --text-step-title: 34px;  --text-step-title--line-height: 1.1;  --text-step-title--letter-spacing: -0.03em; --text-step-title--font-weight: 600;   /* Placement step/done */
  --text-panel-title: 28px; --text-panel-title--letter-spacing: -0.02em; --text-panel-title--font-weight: 600;   /* Dialect Note sheet */
  --text-section-title: 24px; --text-section-title--letter-spacing: -0.02em; --text-section-title--font-weight: 600;
  --text-wordmark: 32px;    --text-wordmark--letter-spacing: -0.03em; --text-wordmark--font-weight: 700;
  --text-wordmark-sm: 26px; --text-wordmark-sm--letter-spacing: -0.03em; --text-wordmark-sm--font-weight: 700;
  --text-label: 12px;       --text-label--letter-spacing: 0.12em; --text-label--font-weight: 700;  /* + uppercase */
  --text-kind: 12px;        --text-kind--letter-spacing: 0.1em;   --text-kind--font-weight: 700;   /* card kind label */
  --text-marker: 11px;      --text-marker--line-height: 1;        --text-marker--font-weight: 700;
  --text-dlf: 11px;         --text-dlf--letter-spacing: 0.08em;   --text-dlf--font-weight: 600;
  --text-prompt: 22px;      --text-prompt--line-height: 1.45;
  --text-prompt-sm: 19px;   --text-prompt-sm--line-height: 1.45;
  --text-prompt-review: 17px; --text-prompt-review--line-height: 1.45;  /* 16px on mobile review */
  --text-writing: 18px;     --text-writing--line-height: 32px;   /* 17px/30px mobile */
  --text-writing-marked: 18px; --text-writing-marked--line-height: 34px; /* 17px/32px mobile */
  --text-quote: 19px;       --text-quote--line-height: 1.35;     /* correction card quote */
  --text-result-level: 96px; --text-result-level--line-height: 0.9; --text-result-level--letter-spacing: -0.04em; --text-result-level--font-weight: 700;
}
```

Notes:

- `--color-*: initial` removes the default Tailwind palette (`zinc-*`, `emerald-*`, …), which every existing component uses. Do it in the same slice that replaces those components, or delay the reset until the last old component is gone (see §7, slice 1).
- Body UI is 15–16px and meta is 13–14px; use Tailwind's arbitrary `text-[15px]` or add `--text-body: 15px; --text-meta: 14px;` if preferred. The design uses 13, 14, 15, 16, 17, 18px.
- Line heights for UI prose: 1.5 (body explanations), 1.45 (notice paragraphs, captions).

### 1.5 Base layer

```css
@layer base {
  html { @apply font-sans text-ink; }
  body {
    background-color: var(--color-desk);
    background-image:
      radial-gradient(rgb(23 33 29 / 0.05) 1px, transparent 1px),
      radial-gradient(900px 500px at 15% 0%, var(--color-desk-highlight), rgb(243 246 241 / 0));
    background-size: 5px 5px, auto;
  }
  @media (max-width: 639px) {   /* mobile frames use a smaller glow */
    body { background-image:
      radial-gradient(rgb(23 33 29 / 0.05) 1px, transparent 1px),
      radial-gradient(500px 300px at 15% 0%, var(--color-desk-highlight), rgb(243 246 241 / 0)); }
  }
  a { color: var(--color-primary); }
  a:hover { color: var(--color-primary-hover); }
  :focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; } /* not drawn; see §6 */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
}
```

Contrast check (WCAG ratio, computed from the tokens). Every text pairing in the markup clears 4.5:1: muted on desk 5.29, muted on sheet 6.26, muted on notice 5.64, disabled-text on sheet 4.57 (the closest), primary on desk 6.64, primary on primary-tint 6.74, dialect on sheet 6.25, white on dialect 6.38, standard on white 8.31, mistake on sheet 6.56, white on mistake 6.70, white on busy 9.66, ink on mistake-tint 13.16, ink on dialect-tint 13.96. Do not lighten `disabled-text`.

---

## 2. Component inventory

Directory proposal: `src/components/ui/*` for primitives, `src/components/<feature>/*` for the rest (`shell`, `home`, `writing`, `review`, `carnet`, `history`, `placement`, `dialect-note`, `states`). Shared types live in a client-safe module (e.g. `src/lib/types.ts`), not imported from server modules. Today `prompt-card.tsx` imports types from `@/modules/...`, which is fine for types only.

Abbreviations for screens: HE=HomeEmpty, M=Main, HR=HomeReview, HQ=HomeQuota, ME=MobileEmpty, MW=MobileWriting, MR=MobileReview, CO=Corrections, DN=DialectNote, ST=States, CA=Carnet, HI=History, PS=PlacementStart, PT=PlacementStep, PD=PlacementDone.

### 2.1 Primitives

**Button** (`ui/button.tsx`, rewrite; keep Base UI `Button` primitive + `cva`)

```ts
type ButtonVariant =
  | "primary"          // bg primary, hover primary-hover, white, 17px/600, h48 px26 (CTA in review: 16px, px24)
  | "secondary"        // bg sheet, 1px line-strong, ink, 14px/500, h44 px16  ("Compris", "Non, corrige-le")
  | "secondary-strong" // bg sheet, 1px input-border, ink, 15px/500, h44 px16–18 ("Réessayer", "Garder celle-là")
  | "outline-primary"  // bg sheet, 1px primary, primary text, 14px/600, h44 px16 ("Pratiquer ça")
  | "outline-dialect"  // bg sheet, 1px dialect, dialect text, 14px/600 ("Ajouter une note")
  | "dialect"          // bg dialect, white, 14px/600 h44 px16; 16px h48 px24 in sheet footer
  | "text"             // no bg/border, primary text, 14px/500, h44 px4 ("↻ Une autre consigne")
  | "quiet"            // no bg, muted text, underline, 14px/400, h44 px4 ("C'est du français louisianais", "Supprimer")
  | "quiet-ink";       // no bg, ink/primary text, underline ("Rester en B1", "Modifier" = primary)
type ButtonSize = "md" /*44*/ | "lg" /*48*/ | "block-mobile" /*54, full width, 18px*/;
interface ButtonProps extends BaseUIButtonProps {
  variant?: ButtonVariant; size?: ButtonSize;
  busy?: boolean;          // → disabled + aria-busy="true" + bg busy (#2F4A40); caller swaps the label
}
```

States: default, hover (primary → `#123C31`), focus-visible, disabled (`color: disabled-text`, `cursor: not-allowed`; the disabled swap button keeps no border/bg), busy. A11y: always a real `<button type="button">`; icon-only needs `aria-label`. Replaces the current shadcn `Button` (unused by feature code today; feature code uses raw `<button className="bg-zinc-900 …">`).

**ButtonLink** (`ui/button-link.tsx`): `next/link` styled with the Button variants. Several "buttons" in the mockups are `<a>` because they navigate: "Une autre consigne · reste 2", "Oui, c'est à nous-autres" (mockup only, see below), "Commencer", "Ma première consigne". Rule: if it navigates, use a link; if it mutates or opens UI, use a button. "Oui, c'est à nous-autres" opens the sheet, so it must be a `<button>` despite the `<a>` in the mockup. "Une autre consigne · reste N" generates a prompt, so it is a `<button>`. "Sauver la note"/"Annuler" are buttons.

**TextLink** (`ui/text-link.tsx`): inline-flex, `min-h-touch` (44px) by default, 15px/500, primary. Resource links use `min-height: 32px` (desktop) / 36px (mobile) in the mockup. That is below the 44px rule, so see §6.

**Field** (`ui/field.tsx`): label + control wiring (`htmlFor`/`id`, `aria-describedby` for hints).

```ts
interface FieldProps { label: ReactNode; hint?: ReactNode; children: ReactElement; }
// Input: h48, px14, 1px input-border, rounded, bg #FFFFFF, Newsreader 18px, lang="fr" when French content
// Textarea (plain, not ruled): p 12px 14px, h92, resize vertical, Newsreader 18px/1.45
```

Label style in the sheet: 15px/600, with an optional 400/muted trailing clause (`La règle · proposée par…`).

**Sheet** (`ui/sheet-surface.tsx`; named `Surface` to avoid clashing with the Dialect Note "sheet"): `bg-sheet border border-line rounded shadow-sheet`, padding prop: `"home"` 36px 44px / `"intro"` 40px 44px / `"review"` 32px 40px 40px / `"list"` 30px 40px 14px (Carnet weaknesses), 30px 40px 24px (Carnet notes), 8px 32px (History) / `"mobile"` 22px 18px (writing), 22px 18px 26px (review). Card variant (correction card) has no shadow: `padding 16px 18px`, `gap 8px`.

**SectionLabel**: `<span>`/`<h2>`/`<label>`/`<legend>` polymorph, 12px/700/0.12em uppercase, `muted` (or `primary` for FOCUS DU JOUR, `dialect` for MON FRANÇAIS LOUISIANAIS). Write the text in sentence case in JSX and uppercase it with CSS (`uppercase`) so screen readers don't spell it out. The copy table gives the visual (uppercase) form.

**PageTitle**: h1, `text-page-title` (46px); `size="step"` 34px; mobile date 38px with a line break between weekday and date (`Samedi<br>14 novembre`).

**KbdHint**: `⌘ ↵` on Apple platforms, `Ctrl ↵` elsewhere, 13px muted, `aria-hidden` (the shortcut is announced through `aria-keyshortcuts="Meta+Enter Control+Enter"` on the submit button). Hidden on mobile (MW has none).

### 2.2 Shell

**AppHeader** (`shell/app-header.tsx`): replaces the ad-hoc `<h1>French Writing Prompter</h1>` + "History" link in `src/app/page.tsx` and the "Back" link in `history-page.tsx`.

```ts
interface AppHeaderProps {
  variant: "full" | "placement";
  level: CefrLevel | null;               // null → first run: no chip
  quota: QuotaState | null;
  placementLink?: { href: string; label: "Je connais mon niveau" | "Finir plus tard" } | null; // PS/PT; PD: none
  current?: "carnet" | "historique";     // aria-current="page"
}
```

- Desktop: `<header>` flex wrap, `justify-between`, gap 8px 24px, padding 18px 40px. Wordmark link: flex wrap baseline, gap 4px 12px, `min-h-touch`, ink, no underline; name 32px/700/-0.03em with the full stop in `mistake` (`#A8321A`); tagline 13px muted.
- `<nav aria-label="Navigation">`: flex wrap, gap 4px 22px, 15px. Nav links ink, 500, no underline; current: underline 2px, offset 6px, weight 600, `aria-current="page"`.
- Mobile (390): two rows. Row 1: wordmark 26px (no tagline) + chip (15px). Row 2: nav (gap 20px) + quota short form, `margin-left:auto`, 14px. Padding 14px 20px 6px, gap 2px.
- `placement` variant: wordmark only (no tagline, inline-flex) + one right-side text link (15px/500), no nav/quota/chip.
- Wordmark links to `/`.

**QuotaText** (`shell/quota-text.tsx`)

```ts
interface QuotaTextProps { quota: QuotaState; firstRun: boolean; compact?: boolean /* mobile */ }
```

Desktop copy: `Reste N consignes sur 3`, exhausted `3 consignes sur 3 prises`, first run `3 consignes aujourd'hui`. Compact copy: `Reste N sur 3` (exhausted compact is not drawn, see §6). Muted, plain text (not live). It updates after generate.

**LevelChip** + **LevelMenu** (`shell/level-menu.tsx`): replaces `LevelSelector`/`LevelBadge` in `level/level-components.tsx` and `LevelCard`.

```ts
interface LevelChipProps { level: CefrLevel; onChange(level: CefrLevel): Promise<void>; }
```

- Chip: `<button aria-label="Niveau CECR B1, changer">B1 ▾</button>`, min-h 44, px14, 1px line-strong, radius 22px, bg sheet, 600 (15px mobile).
- Menu: not drawn. Use Base UI `Menu` (or `Popover` with the same six level buttons as `LevelPicker`): `aria-haspopup`, `aria-expanded`, Escape closes and returns focus to the chip, arrow-key navigation. Options show code + French name (`B1 · Seuil`), current one marked `aria-checked`/`menuitemradio`. Choosing a level calls `PUT /api/level {source:"manual"}`. That resets the advancement counter (already in `CefrTracker`).

### 2.3 Home

**HomePage** (`home/home-page.tsx`, client): owns the Home state machine (see §3). Replaces `PromptCard`, `LevelCard`, and `PlacementTestCard` on `/`.

**LevelPicker** (`home/level-picker.tsx`; HE). Also reusable inside LevelMenu.

```ts
interface LevelPickerProps { value: CefrLevel | null; onChange(l: CefrLevel): void; }
```

`<fieldset>` + `<legend>` (`TON NIVEAU CECR`, legend margin-bottom 12px). Grid `repeat(auto-fit, minmax(min(96px,100%),1fr))`, gap 8px. Each option is `<button aria-pressed>`: min-h 64px, p8, 1px line-strong, bg sheet, column centered, gap 2px; code 18px/600, name 12px muted. Pressed: 2px primary border, bg primary-tint, code 700, name color busy `#2F4A40`. Use the 2px border without shifting layout (inset box-shadow or a transparent 2px base border).

**FirstRunIntro** (HE): serif 26px/1.3 greeting + 16px/1.5 muted line, in a `Surface` padding 40px 44px, gap 26px. Primary `Donne-moi une consigne` (disabled until a level is pressed; this behavior is not drawn, see §6) + TextLink to `/placement`.

**FocusLine** (`home/focus-line.tsx`; M, HR, MW, ME)

```ts
interface FocusLineProps {
  focus: FocusDuJour | null;              // null/empty → render nothing
  variant: "inline" | "stacked" | "hero"; // inline: desktop; stacked: MW; hero: ME (before prompt, mobile)
}
```

- inline: `<p>` flex wrap baseline, gap 4px 14px, 16px; label 12px/700/0.12em primary; names joined ` · `.
- stacked (MW): column, gap 4px, 15px/1.4, padding 0 8px.
- hero (ME): column, gap 10px, padding 20px 0, top+bottom 1px line-strong; each Weakness on its own serif 22px/1.35 line (capitalized name); reason 14px/1.45 muted; followed by full-width primary (54px, 18px) and centered link `Changer de focus dans le Carnet`.
- In HR (desktop review) the FocusLine sits on the title row (flex wrap, baseline, `justify-between`, gap 8px 24px) to the right of the h1.

**PromptSheet** (`writing/prompt-sheet.tsx`; M, HQ, MW, PT, and the read-only variant in HR/MR/HI)

```ts
interface PromptSheetProps {
  prompt: { text: string; meta: PromptMeta | null };
  label?: string;                         // default "Consigne d'écriture"; HQ: "Consigne d'écriture · 3 sur 3"
  mode: "writing" | "review" | "placement";
  swap?: { state: "enabled" | "disabled-quota" | "hidden"; onSwap(): void };
}
```

- writing: label + serif 22px/1.45 `text-wrap: pretty` (19px mobile), gap 10px; then the meta row: flex wrap `justify-between`, gap 4px 16px, padding-bottom 14px, bottom border line; meta 14px muted; swap Button `text`. Mobile: meta and swap stacked, swap `align-self:flex-start`, padding 0, padding-bottom 6px.
- review: column gap 8px (6px mobile), padding-bottom 16px (14px), bottom border; prompt 17px/1.45 ink-2 (16px mobile); meta 13px muted (meta is omitted on MR).
- placement: no meta row; prompt block has padding-bottom 18px + bottom border.
- Motion 1: the prompt fades up when generated (opacity 0→1, translateY ~6px→0, ~200ms). Skip under reduced motion.

**RuledTextarea** (`writing/ruled-textarea.tsx`; M, HQ, MW, PT)

```ts
interface RuledTextareaProps {
  id: string; label: string /* "Ton texte" */;
  value: string; onChange(v: string): void;
  onSubmitShortcut?(): void;              // ⌘/Ctrl+Enter
  density?: "desktop" | "mobile";         // 18/32 vs 17/30
  minRows?: number;                       // MW uses min-height 720px
  readOnly?: boolean;                     // while evaluating
}
```

- `<label for>` styled as SectionLabel, then `<textarea lang="fr" spellcheck={false}>`. `spellcheck=false` is deliberate in every mockup: browser spellcheck would flag Louisiana forms.
- Styles: block, width 100%, `box-sizing:border-box`, margin 0, padding 0, border 0, outline 0, `resize:none`, `overflow:hidden`, bg transparent, `background-image: repeating-linear-gradient(transparent 0, transparent 31px, #DCE3DD 31px, #DCE3DD 32px)` (mobile `29px/30px`), `background-attachment: local`, Newsreader 18px, `line-height:32px` (17/30), ink.
- Auto-grow: set `height = scrollHeight` on input and resize (or `field-sizing: content` with a JS fallback). The height must snap to a multiple of the line-height so the last rule is not cut.
- Since `outline:0` hides the native focus ring, show focus another way, e.g. a 2px primary left border on the sheet or `:focus-visible` rule color change. Not drawn; see §6.
- Keyboard: ⌘+Enter / Ctrl+Enter calls `onSubmitShortcut`; plain Enter inserts a newline.
- Reused by PlacementStep.

**WordMeter** (`writing/word-meter.tsx`; M, HQ, MW, PT)

```ts
interface WordMeterProps { count: number; target: { min: number; max: number } | null; draftStatus?: ReactNode; layout: "desktop" | "mobile"; }
```

- Track: `aria-hidden`, relative, width 240px desktop / 100% mobile, height 6px, radius 3px, bg rule `#DCE3DD` (MW uses `#D3DBD4`, see §6). Target zone: absolute, `left: min/max*100%` (250/300 = 83.3%), right 0, top/bottom −3px (12px tall), radius 3px, bg meter-target. Fill: absolute, left 0, top/bottom 0, `width: min(count/max,1)*100%` (202→67.3%, 52→17.3%, 124→41.3%), radius 3px, primary. Fill is painted above the zone (DOM order: zone, then fill).
- Text: 14px muted; count in `<strong>` 600 ink; `N / 250–300 mots`. With no target (placement): `N mots`, no track.
- Desktop: column gap 8px, min-width 240px, followed by ` · ` + DraftStatus on the same line. Mobile: DraftStatus on a new line (`<br>`), 14px/1.4.
- Never disables submit. Optional nudge paragraph below the sheet (14px muted). Copy exists only for "under target" (see §5/§6).
- A11y: the visual track is hidden. The text is the accessible value. Do not make the count a live region (too chatty).

**DraftStatus** (`writing/draft-status.tsx`): `Brouillon sauvé à 21 h 42`. Time format: `Intl.DateTimeFormat("fr-CA", {hour:"numeric", minute:"2-digit"})` yields `21 h 42`. Otherwise build `${H} h ${mm}` by hand. States: saved (server), saved-local (offline; copy not drawn, see §6), saving (no copy drawn; keep last timestamp), error. Not a live region except on error.

**WritingFooter** (M, HQ, MW): flex wrap, `justify-between`, `align-items:center`, gap 14px 24px, padding-top 6px. Left: WordMeter. Right: KbdHint + submit `Corrige-moi` (primary 48px; mobile 50px, px24, sits beside the meter text below the sheet, outside it).

**SubmitButton**: label `Corrige-moi`, busy label `Je lis ton texte…`. **GenerateButton**: label `Donne-moi une consigne` / `↻ Une autre consigne` / `Une autre consigne · reste N`, busy label `Je cherche une consigne…`. These are two distinct components or two distinct busy flags. Never share a single `loading` boolean (today `PromptCard` does).

### 2.4 Review (Phase C)

**ReviewLayout** (HR/MR): desktop `<main max-w 1200>` → title row → flex row wrap, `align-items:flex-start`, gap 28px; sheet `flex: 1 1 520px; min-width:0`; corrections `flex: 1 1 420px; min-width:0`. Mobile: column, sheet first, Corrections under it; title row replaced by h1 `Évaluation` (26px/600/-0.02em) + summary (padding 0 8px, gap 2px). MR shows no date title and no FocusLine (see §6).

**MarkedText** (`review/marked-text.tsx`; HR, MR, CO, DN backdrop, `/historique/[id]`)

```ts
interface MarkedTextProps {
  text: string;                            // the Student Writing, verbatim
  corrections: Pick<Correction, "id"|"index"|"kind"|"span"|"status">[];
  density: "desktop" | "mobile";           // 18/34 vs 17/32
  onMarkActivate?(id: string): void;       // scroll/focus the matching card
}
```

- Container `lang="fr"`, column, paragraph gap 16px (14px mobile), Newsreader. Paragraphs split on blank lines.
- Rendering: slice `text` by `span.start/end` (UTF-16 offsets). Each mark is `<mark>` + `<sup>` marker:
  - mistake: `background:#F7E1DA; border-bottom:2px solid #A8321A; padding:1px 2px; color:inherit`. Marker: `margin-left:3px; padding:1px 6px; border-radius:9px; background:#A8321A; color:#FFF; font: 700 11px/1 Bricolage`.
  - standard: `background:none; border-bottom:2px dashed #1F4E8C; padding:1px 0`. Marker: `padding:0 5px; border:1px solid #1F4E8C; border-radius:9px; background:#FFFFFF; color:#1F4E8C`.
  - dialect_check: `background:#F6ECC8; text-decoration: underline wavy #7A5A00; text-underline-offset:5px; padding:1px 2px`. Marker: `padding:1px 5px; border-radius:3px; background:#7A5A00; color:#FFF`, text `N ?`.
- Marks whose Correction is resolved as a Dialect Note render as plain text. Marks for `acknowledged` keep their style (not specified, see §6).
- A11y: `<mark>` is not announced by most screen readers. Add visually hidden text after each mark, e.g. `(faute 2)`, `(français standard 1)`, `(à vérifier 6)`, and make the `<sup>` a link/button to the card (`href="#correction-2"`), labelled the same way. Kinds differ by underline style and marker shape, not only hue.
- Motion 2: marks paint left to right in text order when the Evaluation lands (background-size/underline width 0→100%, staggered by `index`, ~60ms each). Reduced motion: no animation.
- Overlapping spans: the renderer must reject or nest them deterministically (see §4.1 invariant, §6).

**EvaluationSummary**: `3 fautes · 2 en français standard · 1 à vérifier`, 14px muted. Pluralize, and omit zero parts (rules not drawn, see §5).

**CorrectionsRegion** (`review/corrections-region.tsx`)

```ts
interface CorrectionsRegionProps {
  evaluation: EvaluationView; focus: FocusDuJour | null; quota: QuotaState;
  onAcknowledge(id): void; onPushBack(id): void /* opens DialectNoteSheet */;
  onConfirmDialect(id): void /* opens sheet */; onRejectDialect(id): void /* → mistake */;
  onNextPrompt(): void;
}
```

- `<section aria-live="polite" aria-label="Évaluation">` (MR: `aria-label="Corrections"`), column gap 12px. On arrival: move focus to the region heading (`tabIndex=-1` on the h2) and announce it. Order: header (h2 `Évaluation` 24px + summary; min-h 32px, flex wrap baseline `justify-between`, gap 4px 16px) → CorrectionCards in text order → ScoresDisclosure → CTAs.
- Keep `aria-live` content small. Announce "Évaluation prête : 3 fautes…" rather than the whole card list (live regions re-read inserted subtrees).
- CTAs: flex wrap, gap 8px 22px, padding-top 10px. Primary button `Une autre consigne · reste N` (48px, 16px, px24; mobile full-width 54px, 17px) + TextLink `« ‑er / ‑é » dans le Carnet →` → `/carnet#weakness-<id>`. Mobile: column gap 4px, both centered full-width.

**CorrectionCard** (`review/correction-card.tsx`; HR, MR, CO)

```ts
type CorrectionCardProps = {
  correction: Correction; density: "desktop" | "mobile";
} & (
  | { kind: "mistake"; onAcknowledge(): void; onPushBack(): void }
  | { kind: "standard"; onAcknowledge(): void }
  | { kind: "dialect_check"; onConfirm(): void; onReject(): void }
);
```

Shared: `<article id="correction-N" aria-labelledby>`, bg sheet, 1px line, radius 6, padding 16px 18px, column gap 8px.

- Header row: flex (wrap for mistake), center, gap 10px, 12px/700/0.1em in the kind color. Marker pill (card version): mistake `padding:2px 8px; radius 10px; bg #A8321A; white`; standard `padding:2px 7px; 1px solid #1F4E8C; radius 10px; bg #FFF`; dialect `padding:2px 7px; radius 3px; bg #7A5A00; white`, text `6 ?`; letter-spacing 0 on the marker. Then the kind label. Mistake only: optional `focus du jour` tag (500, letter-spacing 0, color primary) when `matchesFocus`.
- Quote line: `<p lang="fr">` Newsreader 19px/1.35.
  - mistake: `<s>` quote (muted) ` → ` (muted) `<strong>` suggestion (500, ink). Add hidden text for `<s>` ("avant :") since strikethrough is not announced.
  - standard: quote (not struck, ink) ` → ` `<strong>` Louisiana form (500, standard color) + `DLF` badge (Bricolage 11px/600/0.08em muted). The badge should be an `<abbr title="Dictionary of Louisiana French">` or link to the DLF entry (see §6).
  - dialect_check: context quote wrapped in a dialect-tint span, `padding:1px 3px` (no underline).
- Explanation: 15px/1.5, French model output, rendered as plain text (no dialect post-processing).
- ResourceLinks (mistake only).
- Actions, flex wrap, gap 8px 16px (4px 16px on CO/MR):
  - mistake: secondary `Compris` + quiet `C'est du français louisianais`.
  - standard: secondary `Compris` only (MR: `align-self:flex-start`, no wrapper).
  - dialect_check: `Oui, c'est à nous-autres` (dialect solid, 14px/600, h44 px16) + secondary `Non, corrige-le`. Mobile: column gap 8px, both full-width, h46, 15px.
- States: `open` (default), `acknowledged` (collapsed or dimmed, not drawn), `pushed_back`/`confirmed_dialect` (card replaced by a one-line "Note de dialecte sauvée" confirmation, not drawn), `converted_to_mistake` (re-renders as a mistake card, with suggestion = the tutor's Standard form). After an action, move focus to the next open card.

**ResourceLinks** (`review/resource-links.tsx`; HR, MR, CO, CA)

```ts
interface ResourceLinksProps { resources: ResourceLink[]; layout: "row" | "column"; }
```

`<p>` flex wrap (HR row gap 2px 16px; CA gap 0 18px) or column (CO, MR); 14px; each link inline-flex, min-h 32px (36px mobile). Label `Grammaire · <topic>` / `Input · <source>`. External: `target="_blank" rel="noopener"`, plus visually hidden "(nouvel onglet)".

**ScoresDisclosure** (`review/scores-disclosure.tsx`; HR, MR). Replaces `EvaluationCard`.

```ts
interface ScoresDisclosureProps { overall: CefrLevel; dimensions: { key: DimensionKey; label: string; value: string }[]; defaultOpen?: false; }
```

- Closed: `<button aria-expanded="false" aria-controls>`, flex wrap `justify-between`, gap 4px 16px, min-h 48px, px18, 1px line, radius 6, no bg, 15px, left `Scores ▸` (600), right `Ensemble : B1` (muted).
- Open: wrapper 1px line, radius 6, padding 4px 18px 16px, gap 10px; button min-h 44px `Scores ▾`; `<dl>` grid `repeat(auto-fit, minmax(min(150px,100%),1fr))`, gap 10px 20px, 14px; each item flex `justify-between`, gap 8px, top border line, padding-top 8px; `<dt>` muted, `<dd>` 600.
- Use Base UI `Collapsible`. Dimension keys are the existing four (`grammatical_accuracy`, `vocabulary`, `coherence`, `register_style`). The French labels and the value format (CEFR vs 1–6) need a decision (§6). The existing `tips` have no place in the design (§6).

### 2.5 States

**Notice** (`states/notice.tsx`; HQ, ST offline, HI malformed)

```ts
interface NoticeProps { tone: "calm" | "advance"; title?: ReactNode; children: ReactNode; action?: ReactNode; role?: "status" | undefined; }
```

- calm: 1px line-strong, radius 6, bg notice `#EEF2ED`. Banner layout (ST): flex wrap `justify-between`, gap 10px 20px, padding 14px 18px; text `<p>` `flex: 1 1 320px`, 15px/1.45, lead in `<strong>` 600.
- Quota layout (HQ): column gap 6px, padding 18px 22px; title 18px/600; body 15px/1.5 ink-2.
- Inline-in-row (HI): `<p>` margin 0 0 20px 26px, padding 12px 16px, 15px/1.45.
- advance: 1px primary, bg primary-tint (AdvancementBanner).
- `role="status"` for quota, offline, advancement; plain for the HI inline notice.

**ErrorAlert** (ST): `role="alert"`, 1px mistake border, bg sheet, same banner layout, primary button `Essayer encore` (44px, 15px/600, px18). It never clears the textarea. Two contexts: evaluation failure (copy drawn) and prompt-generation failure (copy not drawn, §6).

**OfflineNotice** (ST): Notice calm + secondary-strong `Réessayer`. Trigger: `navigator.onLine === false` or a `fetch` TypeError. No indefinite skeleton: replace the current `animate-pulse` skeleton in `history-page.tsx` with a bounded loading state.

**ConfirmSwapDialog** (ST): inline `role="alertdialog" aria-label="Changer de consigne"` box, 1px line-strong, bg sheet, `shadow-pop`, banner layout; buttons `Garder celle-là` (secondary-strong) and `Changer` (primary, 44px, 15px/600, px16). Focus moves to `Garder celle-là` (the safe default) on open; Escape = keep; focus returns to the swap button. Shown only when the draft has more than 0 words. Placement (inline near the meta row, or anchored popover) is not drawn.

**AdvancementBanner** (ST): Notice advance + quiet-ink `Rester en B1` (14px, ink, underline, px4). `role="status"`. Clears on the next generate. Undo calls the level-undo API (§4.9) and then hides itself.

**BusyButton labels**: see §2.3; `aria-busy="true"` + disabled, bg `#2F4A40`, 48px, px24, 16px/600.

### 2.6 Dialect Note

**DialectNoteSheet** (`dialect-note/dialect-note-sheet.tsx`; DN; also used for Carnet "Ajouter une note" and "Modifier")

```ts
interface DialectNoteSheetProps {
  open: boolean; onOpenChange(open: boolean): void;
  mode: "from-correction" | "new" | "edit";
  source?: { written: string; tutorProposed: string; correctionId: string; sessionId: number };
  initial: { rule: string; example: string; scope: "word" | "pattern"; scopeLabels: { word: string; pattern: string } };
  onSave(note: DialectNoteInput): Promise<void>;
}
```

- Base UI `Dialog`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` the h2; focus trap; Escape and the close button dismiss; focus returns to the triggering button.
- Desktop: scrim `rgba(23,33,29,0.42)` over the page, panel fixed right, width 560px, full height, padding 36px 40px, bg sheet, `shadow-panel`, column gap 22px. Motion 3: slide in from the right (HANDOFF) / "slides up" (canvas note). Use right on desktop, up on mobile.
- Mobile: bottom sheet, full width, same content (not drawn; §6).
- Content top-down:
  1. Header: flex `justify-between` start, gap 16px; eyebrow `MON FRANÇAIS LOUISIANAIS` (label style, dialect color) + h2 `Ajouter une note de dialecte` 28px/600/-0.02em; close button 44×44, radius 22px, no bg, `aria-label="Fermer"`, SVG X 18×18 stroke ink 1.8 round caps (`M3 3l12 12M15 3L3 15`).
  2. Comparison (from-correction only): grid 2 cols, gap 16px, padding 16px 0, top+bottom 1px line. Each: column gap 4px; caption 13px muted (`T'as écrit` / `Le tuteur proposait`); value `lang="fr"` Newsreader 20px. "Written" is wrapped in dialect-tint `padding:1px 3px`; "proposed" is muted.
  3. Field `La règle` + hint clause; textarea `#regle` h92, model-drafted, editable.
  4. Field `Un exemple`; input `#exemple` h48.
  5. `<fieldset>` legend `Ça vaut pour` (15px/600, mb 4px); two radios, each a `<label>` flex center gap 12px, min-h 44px, 16px; radio 20×20, `accent-color:#7A5A00`.
  6. Footer: `margin-top:auto`, column gap 14px, padding-top 18px, top border; note 14px/1.45 muted; row flex wrap `justify-end` gap 10px: `Échap pour fermer` (13px muted, `margin-right:auto`, hidden on touch), `Annuler` (secondary, 48px, 16px/500, px20), `Sauver la note` (dialect solid, 48px, 16px/600, px24).
- On save: note persisted; the Correction resolves (mark clears in MarkedText, card collapses); the Carnet list gains the note with the `nouvelle` tag; the tutor stops flagging the form (server-side, §4.4).

### 2.7 Carnet

**CarnetPage** (`/carnet`): `max-w 860`, padding 20px 24px 80px, gap 28px; h1 `Carnet`; two Surfaces.

**CarnetWeaknessRow** (CA)

```ts
interface CarnetWeaknessRowProps { weakness: Weakness; onPractice(id: string): Promise<void>; }
```

- Row: flex wrap `justify-between` center, gap 8px 24px, padding 16px 0, top border line; `id="weakness-<id>"` (CTA anchor target).
- Left (`flex:1 1 380px`, column gap 4px): h3 Newsreader 22px/500 (`tranquille`: color ink-2); meta 15px ink-2 (`tranquille`: muted) `N fois · vu <date> · <trend>`, plus ` · ` and `focus du jour` (600, primary) when focus; ResourceLinks row (absent for `tranquille` in the mockup).
- Right: `Pratiquer ça`. outline-primary for actif/en progrès, plain secondary (line-strong, ink, 500) for tranquille. After press: the Weakness becomes Focus for the next prompt. The feedback for this is not drawn (§6). It should set `aria-pressed` or show "Prochaine consigne" text.
- Section header: h2 `À travailler` + 15px muted intro, gap 4px, padding-bottom 16px.

**DialectNoteRow** (CA)

```ts
interface DialectNoteRowProps { note: DialectNote; onEdit(): void; onDelete(): Promise<void>; }
```

- Row: flex wrap `justify-between` center, gap 4px 24px, padding 16px 0, top border. Left column gap 4px: rule `lang="fr"` Newsreader 20px/1.35; example italic 17px ink-2; meta 14px muted `14 novembre · séance d'aujourd'hui · ce mot seulement` + ` · nouvelle` (600, dialect) when new.
- Right: flex gap 16px; `Modifier` (quiet-ink, primary, underline, 14px, padding 0, min-h 44) opens the sheet in edit mode; `Supprimer` (quiet, muted) needs a confirm or undo (not drawn, §6).
- Section header: flex wrap `justify-between` end, gap 8px 24px; h2 `Mon français louisianais` + intro; outline-dialect `Ajouter une note` opens the sheet in `new` mode.

### 2.8 History

**HistoryPage** (`/historique`): replaces `history-page.tsx`. `max-w 860`, gap 24px. Title block column gap 6px: h1 `Historique` + LevelProgressionLine (15px muted) `Niveau : A2 depuis le 3 octobre, B1 depuis le 28 octobre.` (replaces the "Level progression" card). Surface `aria-label="Séances passées"`, padding 8px 32px.

**HistoryRow** (HI)

```ts
type HistoryRowProps = { item: HistoryItem; defaultExpanded?: boolean };
```

- Header (evaluated / abandoned): `<button aria-expanded aria-controls>` flex wrap center, gap 4px 16px, min-h 68px, padding 8px 0, top border (except the first), left-aligned. Glyph `aria-hidden` 10×10:
  - evaluated: filled circle, bg primary, radius 5px.
  - abandoned draft: hollow circle, 2px border muted `#55625C`.
  - unused prompt: dash 10×2, bg disabled-text `#6B7770`. The row is a `<div>`, not a button, and is not expandable.
- Text column (`flex:1 1 300px`, gap 2px): title 18px; weight 600 ink (evaluated), 500 ink-2 (abandoned), 400 muted (unused); meta 14px muted. Chevron `▾`/`▸` 14px muted, `aria-hidden`.
- Status is conveyed in text too (`évaluée`, `pas évalué`, `rien d'écrit`), so the glyph is decorative.
- Expanded (evaluated): column gap 18px, padding 6px 0 24px 26px. Blocks (gap 6px): `CONSIGNE D'ÉCRITURE` + prompt 17px/1.45 ink-2; `TON TEXTE · 270 MOTS` + excerpt `lang="fr"` 18px/1.6 ending with `…` + TextLink `Lire tout le texte avec ses marques` → `/historique/[id]`; `CORRECTIONS` (gap 8px) + `<ul lang="fr">` gap 6px, Newsreader 17px/1.4: each `<li>` flex wrap gap 2px 12px; kind cell `flex:0 0 150px` Bricolage 13px/600 line-height 24px in the kind color (`Faute` / `Français standard` / `Note de dialecte`); value `<s>` quote (muted) `→` suggestion, or `quote → suggestion` for standard, or `a tombé, gardé comme t'as écrit` for a confirmed Dialect Note.
- Expanded (abandoned draft): not drawn (§6). Assume prompt + draft excerpt, no corrections block.
- Malformed: header meta ends `· détails incomplets`; body is the inline Notice. The row must render from whatever fields parse. Wrap each row in an error boundary so one bad row can't blank the list.

**SessionReviewPage** (`/historique/[id]`): read-only Phase C (ReviewLayout + MarkedText + CorrectionCards without actions or with resolved-state text + ScoresDisclosure). Not drawn (§6).

### 2.9 Placement

**PlacementStart** (PS): h1 `Test de placement`; Surface 40px 44px, gap 26px; serif intro 24px/1.4 pretty; `<ol>` grid `repeat(auto-fit,minmax(min(180px,100%),1fr))` gap 12px; each `<li>` column gap 4px, padding-top 12px, border-top 3px (primary for the current step, line-strong otherwise); `Étape N` 13px muted, name 17px/600; caption 15px/1.5 muted; ButtonLink/Button `Commencer`. Replaces `PlacementTestCard` (idle phase).

**PlacementProgress** (PT)

```ts
interface PlacementProgressProps { step: 1 | 2 | 3; }
```

`role="progressbar" aria-label="Avancement du test" aria-valuemin=1 aria-valuemax=3 aria-valuenow={step}`, plus `aria-valuetext="Étape 2 sur 3"`. Grid 3 cols, gap 8px; segments 4px tall, radius 2px; done/current primary, upcoming line-strong.

**PlacementStep** (PT): h1 `Test de placement · étape 2 sur 3` (34px/1.1) + progress, column gap 12px; Surface 36px 44px gap 18px: PromptSheet (placement mode) + RuledTextarea + footer (WordMeter without target + DraftStatus | KbdHint + primary `Consigne suivante`). Busy label for this button is not drawn (§6). Header link `Finir plus tard` → `/`.

**PlacementResult** (PD)

```ts
interface PlacementResultProps { result: PlacementResultView; onAccept(): void; }
```

h1 `Test de placement · fini`; Surface `aria-live="polite"` 40px 44px gap 26px; top row flex wrap center gap 12px 28px: level 96px/0.9/700/-0.04em primary; column (`flex:1 1 300px`, gap 6px): label `TON NIVEAU CECR · SEUIL` + serif 22px/1.4 summary. `<dl>` column: rows flex wrap baseline, gap 2px 16px, padding 12px 0, top border (last also bottom); `<dt>` `flex:0 0 110px` 14px muted `Étape N`; `<dd>` level `flex:0 0 48px` 17px/600; `<dd>` summary `flex:1 1 260px` 15px. CTAs: primary `Ma première consigne` (to `/`, Phase A-returning or straight to generate, §6) + TextLink `Choisir un autre niveau` (opens LevelPicker on `/`). Header: wordmark only.

### 2.10 Replacement summary

| Current | Fate |
|---|---|
| `src/app/page.tsx` (h1 + History link + 3 cards) | Becomes a thin wrapper around `HomePage`; header moves to layout |
| `components/prompt/prompt-card.tsx` | Split into `HomePage` state machine, PromptSheet, RuledTextarea, WordMeter, DraftStatus, Generate/Submit buttons, ErrorAlert, QuotaNotice, AdvancementBanner |
| `components/prompt/evaluation-card.tsx` | Replaced by CorrectionsRegion + ScoresDisclosure. Its dimension list and `key`s are reused |
| `components/level/level-card.tsx` | Removed. Level display/change moves to LevelChip/LevelMenu; first-run selection to LevelPicker |
| `components/level/level-components.tsx` | `CefrLevel` type moves to shared types; `LEVEL_LABELS` becomes French (Découverte…Maîtrise); `LEVEL_COLORS` dropped (no per-level hue in the design) |
| `components/placement/placement-test-card.tsx` | Replaced by `/placement` route + PlacementStart/Step/Result; its fetch flow is reused |
| `components/history/history-page.tsx` | Replaced by HistoryPage/HistoryRow; `formatDate` (en-US) becomes a French formatter |
| `components/ui/button.tsx` | Rewritten with the new variants (§2.1) |

---

## 3. Screen → route / state map

Routes (French slugs to match the UI; see §6 for the rename decision): `/` (Home), `/placement`, `/carnet`, `/historique`, `/historique/[id]`. Redirect `/history` → `/historique` if renamed.

### 3.1 Home state machine (`/`)

```ts
type HomePhase =
  | { phase: "A0-first-run"; selectedLevel: CefrLevel | null }       // no CEFR level
  | { phase: "A-ready" }                                              // level set, no active prompt today (or after review)
  | { phase: "B-writing"; session: ActiveSession }                    // prompt + draft
  | { phase: "C-review"; session: ActiveSession; evaluation: EvaluationView };

interface HomeOverlay {                 // orthogonal to phase
  generating: boolean;                  // "Je cherche une consigne…"
  evaluating: boolean;                  // "Je lis ton texte…"
  error: null | { kind: "generate" | "evaluate"; retry(): void };
  offline: boolean;
  confirmSwap: boolean;
  advancement: null | LevelAdvancement;
  dialectSheet: null | { correctionId: string };
  quotaExhausted: boolean;              // derived from quota.remaining === 0
}
```

On load, a single bootstrap call returns level, quota, focus, the active session (latest session today that is not abandoned), and any pending advancement. It resolves to: no level → A0; active session with evaluation → C; active session without evaluation → B (draft restored, local copy reconciled); else → A-ready.

| Screen | Route | State | Data needed |
|---|---|---|---|
| HomeEmpty | `/` | A0-first-run (`level=null`); header without chip; quota text first-run form | learner display name (does not exist; §6), quota |
| MobileEmpty | `/` @390 | A-ready, FocusLine `hero`, full-width generate | level, quota, Focus du jour (names + reason) |
| *(desktop A-ready)* | `/` | A-ready. Not drawn: compose date title + FocusLine inline + Surface with generate button (§6) | same |
| Main | `/` | B-writing, quota > 0, swap enabled | level, quota, focus, active session {prompt text, PromptMeta, draft text, draft savedAt} |
| MobileWriting | `/` @390 | B-writing, FocusLine `stacked`, footer outside the sheet | same |
| HomeQuota | `/` | B-writing + quotaExhausted. QuotaNotice above the sheet; label `· 3 SUR 3`; swap disabled `· à minuit`; submit enabled | quota {remaining 0, resetsAt}, active session |
| HomeReview | `/` | C-review, desktop split, scores closed (open via `scoresOpen`) | session (prompt, meta, writing), EvaluationView {corrections, counts, scores}, focus, quota (CTA `reste N`), weakness link target |
| MobileReview | `/` @390 | C-review, stacked, no date/Focus | same |
| Corrections | (component sheet) | CorrectionCard × 3 kinds + MarkedText fragments | Correction objects |
| DialectNote | `/` overlay (also `/carnet`) | C-review + `dialectSheet` open; backdrop shows MarkedText | Correction {quote, suggestion}, model-drafted rule, example, scope labels |
| States | (component sheet) | `error.evaluate`, `offline`, `confirmSwap`, `advancement`, busy labels | draft word count (swap copy), advancement {from, to} |
| Carnet | `/carnet` | list page | Weakness[] (with focus flag, resources), DialectNote[] |
| History | `/historique` | list page, one row expanded, one malformed | HistoryItem[], level history |
| PlacementStart | `/placement` | `start` | placement state (exists? resumable?) |
| PlacementStep | `/placement` | `step` {n, prompt, draft} | current step, prompt text, draft |
| PlacementDone | `/placement` | `done` | PlacementResultView |

### 3.2 Placement state (`/placement`)

```ts
type PlacementPhase =
  | { phase: "start"; resumable: boolean }
  | { phase: "step"; step: 1 | 2 | 3; prompt: string; draft: Draft; submitting: boolean }
  | { phase: "done"; result: PlacementResultView };
```

Only reachable on first run (no level). If a level exists, redirect to `/`. "Finir plus tard" keeps the server state so it can resume. Today the server keeps `placementTest` in a module-level variable, which is lost on restart; see §4.10.

### 3.3 Transitions

- A0 → (press a level, then `Donne-moi une consigne`) → `PUT /api/level` then `POST /api/prompt` → B.
- A0 → link → `/placement`.
- A-ready → generate → B. Clears the AdvancementBanner.
- B → swap: if the draft has words, confirm → `POST /api/prompt {replaceSessionId}`. The old session becomes an "abandoned draft" in History. Quota decrements.
- B → submit (button or ⌘/Ctrl+Enter) → evaluating → C (focus moves to the Corrections heading). Failure → ErrorAlert, stays in B with the text intact.
- C → `Une autre consigne · reste N` → generate → B (disabled when N=0).
- C → Dialect sheet → save → card resolves, stays in C.
- Placement done → `Ma première consigne` → `/` A-ready (or auto-generate; §6).

---

## 4. Data the UI needs that does not exist yet

These are shapes for the UI contract, not implementation. Server endpoints are suggestions; the wire shape is what matters.

### 4.1 Correction

The current `Evaluation` (`writing-evaluator.ts`) has `dimensions`, `overall_cefr`, and `tips` only, with no inline corrections. The evaluator prompt is in English and returns English comments/tips.

```ts
type CorrectionKind = "mistake" | "standard" | "dialect_check";

type CorrectionStatus =
  | "open"
  | "acknowledged"           // "Compris"
  | "pushed_back"            // mistake → "C'est du français louisianais" → Dialect Note saved
  | "confirmed_dialect"      // dialect_check → "Oui" → Dialect Note saved
  | "converted_to_mistake";  // dialect_check → "Non, corrige-le"

interface Correction {
  id: string;
  index: number;                      // 1-based, text order, shared numbering across kinds
  kind: CorrectionKind;
  span: { start: number; end: number }; // UTF-16 offsets into the stored writingText
  quote: string;                      // === writingText.slice(start, end); server validates and drops mismatches
  contextQuote?: string;              // dialect_check card shows a wider phrase ("mon petit cousin a tombé") than the mark ("a tombé")
  suggestion: string;                 // mistake: corrected form; standard: Louisiana form; dialect_check: the Standard form the tutor would propose ("est tombé")
  explanation: string;                // French, model output, shown verbatim
  category: WeaknessCategoryId | null;// required for mistake & dialect_check; null for standard
  dlf?: { entryId: string; headword: string }; // required for standard; spelling authority for Louisiana forms
  resources: ResourceLink[];          // mistake only: one grammar + one input, picked by category
  matchesFocus: boolean;              // mistake only
  status: CorrectionStatus;
  dialectNoteId?: string;             // set when resolved into a note
  dialectDraft?: {                    // pre-drafted for the sheet (mistake pushback & dialect_check)
    rule: string; example: string;
    scopeLabels: { word: string; pattern: string }; // "Ce mot seulement : « tomber »" / "Toute la famille : « avoir » avec les verbes de mouvement"
  };
}
```

Invariants the UI relies on:

- Spans do not overlap and are sorted. On conflict the server keeps the earlier one or merges them; the UI never resolves overlaps.
- A `standard` Correction never increments a Weakness and is never counted in `fautes`.
- A `standard` suggestion must be a DLF form (`dlf` present). If no DLF entry is found, the server drops the Correction rather than inventing one.
- A `dialect_check` counts toward a Weakness only after `converted_to_mistake`.
- Corrections suppressed by an existing Dialect Note never reach the UI.

### 4.2 EvaluationView

```ts
interface EvaluationView {
  sessionId: number;
  corrections: Correction[];
  counts: { mistakes: number; standard: number; toCheck: number }; // drives the summary line; recomputed after actions
  overall: CefrLevel;
  dimensions: Record<DimensionKey, { label: string; value: string }>; // DimensionKey = existing four keys
  tips?: { perDimension: Record<DimensionKey, string>; holistic: string }; // existing; placement TBD (§6)
  focusWeaknessLink?: { weaknessId: string; shortName: string };  // CTA "« ‑er / ‑é » dans le Carnet →"
  dataIssue?: "corrections_unreadable";                           // malformed stored JSON
}
```

Correction actions: `POST /api/corrections/:id { action: "acknowledge" | "reject_dialect" }` returns the updated Correction + counts. The pushback/confirm paths go through Dialect Note create (§4.4), which resolves the Correction atomically.

### 4.3 Weakness, Weakness category, Resource

```ts
type WeaknessCategoryId = string;   // stable slug from a curated taxonomy, e.g. "infinitive-after-preposition"

interface WeaknessCategory {
  id: WeaknessCategoryId;
  name: string;          // "Infinitif ou participe (‑er / ‑é)": Carnet heading, mobile Focus hero (capitalized)
  inlineName: string;    // "infinitif ou participe (‑er / ‑é)": Focus line (lowercase)
  historyName: string;   // "Infinitif ou participe": History row title (parenthetical dropped)
  shortName: string;     // "‑er / ‑é": review CTA
  resources: { grammar: ResourceLink; input: ResourceLink } | null;
}

interface Weakness extends WeaknessCategory {
  count: number;                         // Mistakes in this category (excludes standard; includes converted dialect checks; minus pushed-back)
  lastSeenAt: string;                    // ISO; UI renders "vu aujourd'hui" / "vu le 6 novembre"
  trend: "actif" | "en_progres" | "tranquille";  // display "actif" / "en progrès" / "tranquille"; rule owned by server
  isFocus: boolean;
}

interface ResourceLink {
  id: string; kind: "grammar" | "input";
  label: string;        // topic for grammar ("l'infinitif après une préposition"), source name for input ("InnerFrench")
  url: string;
}
```

Ordering: by trend (actif → en progrès → tranquille), then count desc. `GET /api/weaknesses`, `POST /api/weaknesses/:id/practice` (sets it as Focus for the next prompt).

### 4.4 Dialect Note (CRUD)

```ts
interface DialectNote {
  id: string;
  rule: string;                          // learner-edited
  example: string;
  scope: "word" | "pattern";
  scopeLabel: string;                    // Carnet meta: "ce mot seulement" / "toute la famille"
  match: { lemma?: string; pattern?: string }; // what the tutor must stop flagging (server use; UI doesn't display)
  written?: string; tutorProposed?: string;    // from-correction notes
  source: { sessionId: number; sessionDate: string } | null; // meta "séance d'aujourd'hui" / "séance du 9 novembre"; null for manual notes
  createdAt: string;
  isNew: boolean;                        // "nouvelle" tag; expiry rule TBD (§6)
}
type DialectNoteInput = Pick<DialectNote, "rule" | "example" | "scope"> & { correctionId?: string };
```

`GET /api/dialect-notes`, `POST` (with optional `correctionId` → resolves that Correction and reverses any Weakness increment), `PATCH /:id`, `DELETE /:id`. Notes are passed to the evaluator so the form is not flagged again.

### 4.5 Focus du jour

```ts
interface FocusDuJour {
  date: string;                          // learner-local YYYY-MM-DD
  weaknesses: Pick<WeaknessCategory, "id" | "name" | "inlineName" | "historyName" | "shortName">[]; // 1–2
  reason: string;                        // ME copy: "C'est ce qui est revenu le plus dans tes dernières évaluations. La consigne va t'y faire travailler."
  source: "auto" | "practice";           // practice = chosen via "Pratiquer ça"
}
```

Empty (`weaknesses: []`) for new learners, in which case FocusLine renders nothing. The prompt generator consumes Focus. Each session stores the Focus it was generated with (History titles are based on it).

### 4.6 Prompt meta (structured)

Today the prompt generator returns free text plus `{cefrLevel, dialect}`. The meta line and word meter need structure:

```ts
interface PromptMeta {
  genre: string;          // "récit", "lettre"
  tenses: string;         // "passé composé et imparfait", "futur proche"
  wordRange: { min: number; max: number }; // 250–300 in mocks; should vary by CEFR (§6)
  tone: string;           // "ton chaleureux", "ton amical"
}
```

Display: `${genre} · ${tenses} · ${min}–${max} mots · ${tone}` (en dash in the range).

### 4.7 Draft persistence

```ts
interface Draft {
  sessionId: number;
  text: string;
  savedAt: string;        // ISO; DraftStatus renders local "21 h 42"
  origin: "server" | "local";
}
```

- Server: `PUT /api/sessions/:id/draft { text, clientSavedAt }`, debounced (~1–2s) and on `visibilitychange`/`pagehide`. The `writingText` column can hold the draft until evaluation; a `draftSavedAt` column is needed.
- Local: `localStorage["draft:<sessionId>"] = { text, savedAt }` on every change (throttled). It is the source of truth when offline.
- Reconcile on load: newest `savedAt` wins. If local is newer, push it to the server.
- Placement steps use the same shape keyed by placement step.

### 4.8 Session status / History

```ts
type SessionStatus = "in_progress" | "evaluated" | "abandoned_draft" | "unused_prompt";
// abandoned_draft: replaced by swap (or day ended) with ≥1 word; unused_prompt: replaced/expired with 0 words

interface HistoryItem {
  id: number;
  createdAt: string;
  status: SessionStatus;
  focusTitle: string | null;              // historyName(s) joined " · "; null for legacy sessions (§6 fallback)
  wordCount: number;
  mistakeCount?: number;                  // evaluated
  cefrLevel?: CefrLevel;                  // evaluated
  prompt: { text: string; meta: PromptMeta | null };
  excerpt?: string;                       // first ~3 sentences
  correctionsSummary?: { kind: CorrectionKind | "dialect_note"; quote: string; suggestion?: string }[];
  dataIssue?: "corrections_unreadable";
}

interface LevelProgression { entries: { level: CefrLevel; since: string }[] } // "Niveau : A2 depuis le 3 octobre, B1 depuis le 28 octobre."
```

`GET /api/sessions` must parse each row defensively and return a `dataIssue` per row instead of throwing. Today `history-page.tsx` runs `JSON.parse` in render, so one bad row crashes the page. `GET /api/sessions/:id` serves the full read-only review.

### 4.9 Level advancement + undo

`POST /api/evaluate` already returns `advancement: LevelChange | null`. The UI also needs:

```ts
interface LevelAdvancement { changeId: number; fromLevel: CefrLevel; toLevel: CefrLevel; createdAt: string; dismissedAt?: string }
```

- `POST /api/level/undo { changeId }`: restores `fromLevel` (source "manual"), resets the consecutive counter.
- The pending advancement is returned by the bootstrap until the next generate, so the banner survives a reload.
- Note: `/api/evaluate` today defaults an unset level to A2 silently, and `tracker` state (`consecutiveAbove`) is in-memory. Undo and persistence need the counter stored.

### 4.10 Quota with reset time

```ts
interface QuotaState { used: number; remaining: number; max: 3; resetsAt: string /* ISO of next local midnight */; todayIndex?: number /* "3 SUR 3" */ }
```

Bug to fix: `quota-store.ts` keys the day with `new Date().toISOString()`, which is UTC midnight, not local midnight. The client must send its IANA time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`, header or cookie) so the server computes the local date and `resetsAt`. The countdown `dans 1 h 46` is computed client-side from `resetsAt`.

### 4.11 Placement

```ts
interface PlacementState { id: string; step: 1 | 2 | 3 | "done"; prompt?: string; draft?: Draft }
interface PlacementResultView {
  finalLevel: CefrLevel; levelName: string;        // "Seuil"
  summary: string;                                 // French, model
  steps: { step: 1 | 2 | 3; level: CefrLevel; summary: string }[]; // one-line French summary per step
}
```

Placement must be persisted (today a module-level `let placementTest`). Whether Placement prompts consume the daily quota is not specified (§6).

### 4.12 Learner profile

`{ displayName: string | null }` for `Bienvenue, Logan.`. There are no users today.

### 4.13 Bootstrap

`GET /api/today` → `{ level, levelName, quota, focus, activeSession: { id, prompt, meta, draft, evaluation? } | null, advancement: LevelAdvancement | null, profile }`. This lets Home render the right phase in one round trip.

---

## 5. UI copy table

The French below is verbatim from the markup. `{x}` marks values to interpolate. **P** = placeholder per the handoff (do not treat as final). **M** = model output (shown verbatim, never hard-coded). **I** = inferred, i.e. not drawn; written here so agents don't invent variants. Owner to confirm.

Caveat for all rows: the handoff says the Louisiana French in the mockups (UI strings included) was written by the designer model and has not been checked against the DLF.

### AppHeader

| Key | String | Notes |
|---|---|---|
| wordmark | `Lâche pas` + `.` (full stop in `#A8321A`) | **P**: app name pending |
| tagline | `atelier d'écriture · français louisianais` | desktop only |
| nav.label | `Navigation` | `aria-label` |
| nav.carnet | `Carnet` | |
| nav.history | `Historique` | |
| quota.remaining | `Reste {n} consignes sur 3` | desktop |
| quota.remaining.one | `Reste 1 consigne sur 3` | **I** singular |
| quota.exhausted | `3 consignes sur 3 prises` | |
| quota.firstRun | `3 consignes aujourd'hui` | HE |
| quota.compact | `Reste {n} sur 3` | mobile |
| quota.compact.exhausted | `3 sur 3 prises` | **I** |
| chip | `{level} ▾` | |
| chip.label | `Niveau CECR {level}, changer` | `aria-label` |
| placement.start.link | `Je connais mon niveau` | PS header |
| placement.step.link | `Finir plus tard` | PT header |

### Home / Phase A

| Key | String | Notes |
|---|---|---|
| title.date | `Samedi 14 novembre` | `Intl` fr weekday + day + month, first letter capitalized. Mobile: `Samedi` ⏎ `14 novembre` |
| welcome.lead | `Bienvenue, {name}. Icitte, on écrit un petit texte par jour, en français de la Louisiane.` | name source missing (§6) |
| welcome.body | `Pour te donner une consigne à ta mesure, il me faut ton niveau. Tu pourras le changer n'importe quand.` | |
| level.legend | `TON NIVEAU CECR` | |
| level.A1..C2 | `Découverte`, `Survie`, `Seuil`, `Avancé`, `Autonome`, `Maîtrise` | replaces English `LEVEL_LABELS` |
| generate | `Donne-moi une consigne` | |
| generate.busy | `Je cherche une consigne…` | ellipsis character `…` |
| placement.link | `Pas sûr ? Fais le test de placement (3 consignes)` | narrow no-break space before `?` is French typography; markup uses a normal space |

### FocusLine

| Key | String | Notes |
|---|---|---|
| focus.label | `FOCUS DU JOUR` | primary color |
| focus.names | `{inlineName} · {inlineName}` | e.g. `infinitif ou participe (‑er / ‑é) · imparfait ou passé composé`. Uses U+2011 non-breaking hyphen |
| focus.hero.names | `Infinitif ou participe (‑er / ‑é)` / `Imparfait ou passé composé` | one per line, capitalized (`name`) |
| focus.reason | `C'est ce qui est revenu le plus dans tes dernières évaluations. La consigne va t'y faire travailler.` | auto source. Practice-source wording **I** missing |
| focus.change | `Changer de focus dans le Carnet` | ME |

### PromptSheet / writing

| Key | String | Notes |
|---|---|---|
| prompt.label | `CONSIGNE D'ÉCRITURE` | |
| prompt.label.withIndex | `CONSIGNE D'ÉCRITURE · {i} SUR 3` | shown in HQ only (§6) |
| prompt.text | e.g. `C'est samedi matin chez ta grand-mère…` | **M** |
| prompt.meta | `{genre} · {tenses} · {min}–{max} mots · {tone}` | e.g. `récit · passé composé et imparfait · 250–300 mots · ton chaleureux` |
| swap | `↻ Une autre consigne` | |
| swap.disabled | `↻ Une autre consigne · à minuit` | quota exhausted |
| text.label | `TON TEXTE` | |
| meter | `{n} / {min}–{max} mots` | count bold |
| meter.noTarget | `{n} mots` | Placement |
| draft.saved | `Brouillon sauvé à {H} h {mm}` | joined to meter with ` · ` on desktop |
| draft.local | `Brouillon gardé sur cet appareil` | **I** offline variant |
| kbd | `⌘ ↵` | `Ctrl ↵` on non-Apple, **I** |
| submit | `Corrige-moi` | |
| submit.busy | `Je lis ton texte…` | |
| nudge.under | `Encore une cinquantaine de mots, si le cœur t'en dit. Tu peux envoyer n'importe quand.` | for ~50 short; other distances/over-target **I** missing |

### Quota notice (HQ)

| Key | String | Notes |
|---|---|---|
| quota.notice.title | `T'as pris tes trois consignes pour aujourd'hui.` | |
| quota.notice.body | `La prochaine arrive à minuit, dans {h} h {mm}. Ton brouillon reste icitte : tu peux le finir et l'envoyer quand tu veux.` | without a draft: second sentence omitted **I** |

### Review (Phase C)

| Key | String | Notes |
|---|---|---|
| review.sheet.label | `Consigne et ton texte` | `aria-label` |
| review.text.label | `TON TEXTE · {n} MOTS` | |
| review.region.label | `Évaluation` (desktop) / `Corrections` (mobile) | `aria-label` |
| review.title | `Évaluation` | h2 desktop / h1 mobile |
| review.mobile.listLabel | `CORRECTIONS` | MR h2 |
| review.summary | `{n} fautes · {n} en français standard · {n} à vérifier` | singular `1 faute`; zero parts omitted **I**; zero overall `Aucune correction` **I** |
| scores.closed | `Scores ▸` | |
| scores.open | `Scores ▾` | |
| scores.overall | `Ensemble : {level}` | |
| scores.dimensions | `Grammaire`, `Vocabulaire`, `Cohérence`, `Consigne suivie` | **P**: use the app's four dimensions. Proposed French: `Grammaire` (grammatical_accuracy), `Vocabulaire` (vocabulary), `Cohérence` (coherence), `Registre et style` (register_style); owner to confirm |
| cta.next | `Une autre consigne · reste {n}` | at 0: `Une autre consigne · à minuit` **I** (disabled) |
| cta.carnet | `« {shortName} » dans le Carnet →` | e.g. `« ‑er / ‑é » dans le Carnet →` |

### CorrectionCard

| Key | String | Notes |
|---|---|---|
| kind.mistake | `FAUTE` | |
| kind.standard | `FRANÇAIS STANDARD` | |
| kind.dialect | `ÇA SE DIT COMME ÇA ?` | |
| tag.focus | `focus du jour` | |
| marker | `{n}` / `{n} ?` (dialect) | |
| arrow | `→` | |
| dlf | `DLF` | |
| explanation | e.g. `Après une préposition (à, de, pour), le verbe reste à l'infinitif : ‑er, pas ‑é.` | **M** |
| resource.grammar | `Grammaire · {topic}` | topics **P** |
| resource.input | `Input · {source}` | `InnerFrench`, `Télé-Louisiane` **P** |
| action.ack | `Compris` | |
| action.pushback | `C'est du français louisianais` | |
| action.confirm | `Oui, c'est à nous-autres` | |
| action.reject | `Non, corrige-le` | |
| sr.mark | `faute {n}` / `français standard {n}` / `à vérifier {n}` | **I** visually hidden |

Correction sheet explainers (`Corrections.dc.html`). These are not placed on any screen; usable as a legend/help if wanted:

| Kind | Title | Blurb |
|---|---|---|
| mistake | `Faute` | `Une vraie erreur. Elle compte dans tes points faibles.` |
| standard | `Français standard` | `Pas une faute. Une forme d'icitte t'est proposée ; ça compte pas.` |
| dialect | `Ça se dit comme ça ?` | `Le tuteur est pas sûr. Oui : ça devient une note de dialecte. Non : c'est une faute.` |

### States

| Key | String | Notes |
|---|---|---|
| error.evaluate.lead | `J'ai pas pu lire ton texte ce coup-ci.` | bold |
| error.evaluate.body | `Il est toujours là, y a rien de perdu.` | |
| error.retry | `Essayer encore` | |
| error.generate | (not drawn) | **I** proposal: `J'ai pas pu trouver de consigne ce coup-ci.` + `Essayer encore` |
| offline.lead | `Pas de connexion.` | |
| offline.body | `Ton brouillon est gardé sur cet appareil. Tu peux continuer à écrire.` | |
| offline.retry | `Réessayer` | |
| swap.label | `Changer de consigne` | `aria-label` |
| swap.lead | `Changer de consigne ?` | |
| swap.body | `Ton brouillon de {n} mots va rester dans l'Historique.` | |
| swap.keep | `Garder celle-là` | |
| swap.confirm | `Changer` | |
| advance.lead | `Te voilà en {to}.` | |
| advance.body | `Tes dernières évaluations étaient au-dessus de {from}, ça fait que les consignes vont monter d'un cran.` | |
| advance.undo | `Rester en {from}` | |

The uppercase captions in `States.dc.html` (`L'ÉVALUATION A PAS PASSÉ · LE TEXTE RESTE`, `HORS LIGNE · PAS DE SQUELETTE SANS FIN`, `CHANGER DE CONSIGNE AVEC UN BROUILLON`, `PASSAGE DE NIVEAU · S'EFFACE À LA PROCHAINE CONSIGNE`, `CHARGEMENT · DEUX ÉTATS, DEUX LIBELLÉS`) are designer annotations. Do not ship them.

### DialectNoteSheet

| Key | String | Notes |
|---|---|---|
| eyebrow | `MON FRANÇAIS LOUISIANAIS` | |
| title | `Ajouter une note de dialecte` | edit mode `Modifier la note` **I** |
| close | `Fermer` | `aria-label` |
| written | `T'as écrit` | |
| proposed | `Le tuteur proposait` | |
| rule.label | `La règle` | |
| rule.hint | `· proposée par le tuteur, c'est toi qui as le dernier mot` | 400, muted |
| rule.value | e.g. `Avec « tomber », on prend l'auxiliaire « avoir » : il a tombé.` | **M** draft |
| example.label | `Un exemple` | |
| example.value | e.g. `Mon petit cousin a tombé dans la boue.` | **M** draft |
| scope.legend | `Ça vaut pour` | |
| scope.word | `Ce mot seulement : « {lemma} »` | **M** lemma |
| scope.pattern | `Toute la famille : {pattern}` | **M** e.g. `« avoir » avec les verbes de mouvement` |
| footer.note | `Une fois sauvée, la note va dans ton Carnet et le tuteur te reprendra plus là-dessus.` | |
| footer.esc | `Échap pour fermer` | |
| cancel | `Annuler` | |
| save | `Sauver la note` | |

### Carnet

| Key | String | Notes |
|---|---|---|
| title | `Carnet` | |
| weak.title | `À travailler` | |
| weak.intro | `Les fautes qui reviennent. « Pratiquer ça » oriente ta prochaine consigne.` | |
| weak.meta | `{n} fois · vu {when} · {trend}` | `when`: `aujourd'hui` / `le 6 novembre`; trend `actif` / `en progrès` / `tranquille`. Singular `1 fois` |
| weak.meta.focus | ` · focus du jour` | 600 primary |
| weak.practice | `Pratiquer ça` | |
| weak.names | `Infinitif ou participe (‑er / ‑é)`, `Imparfait ou passé composé`, `Genre des noms`, `Prépositions après le verbe`, `Accents (é / è / ê)` | **P** taxonomy |
| notes.title | `Mon français louisianais` | |
| notes.intro | `Tes notes de dialecte. Le tuteur les suit et te reprend pas là-dessus.` | |
| notes.add | `Ajouter une note` | |
| notes.meta | `{date} · {source} · {scope}` | source `séance d'aujourd'hui` / `séance du 9 novembre`; scope `ce mot seulement` / `toute la famille` |
| notes.meta.new | ` · nouvelle` | 600 dialect |
| notes.edit | `Modifier` | |
| notes.delete | `Supprimer` | |
| empty.weak / empty.notes | (not drawn) | **I** needed |

### History

| Key | String | Notes |
|---|---|---|
| title | `Historique` | |
| levels | `Niveau : {L1} depuis le {date1}, {L2} depuis le {date2}.` | |
| list.label | `Séances passées` | `aria-label` |
| row.title | `{historyName} · {historyName}` | e.g. `Infinitif ou participe · Imparfait ou passé composé` |
| row.meta.evaluated | `{Weekday d month} · évaluée · {n} fautes · {level}` | |
| row.meta.malformed | `{Weekday d month} · évaluée · détails incomplets` | |
| row.abandoned.title | `Brouillon laissé de côté` | |
| row.abandoned.meta | `{date} · {n} mots · pas évalué` | |
| row.unused.title | `Consigne pas utilisée` | |
| row.unused.meta | `{date} · rien d'écrit` | |
| row.malformed.notice | `Les corrections de cette séance ont pas pu être relues. Ta consigne et ton texte sont gardés, et le reste de l'Historique marche comme d'habitude.` | |
| expanded.prompt | `CONSIGNE D'ÉCRITURE` | |
| expanded.text | `TON TEXTE · {n} MOTS` | |
| expanded.readAll | `Lire tout le texte avec ses marques` | |
| expanded.corrections | `CORRECTIONS` | |
| kind.mistake / standard / note | `Faute` / `Français standard` / `Note de dialecte` | sentence case here |
| note.kept | `{quote}, gardé comme t'as écrit` | |
| empty | (not drawn) | **I** needed |

### Placement

| Key | String | Notes |
|---|---|---|
| title | `Test de placement` | |
| intro | `Trois consignes, une après l'autre. Écris ce que tu peux pour chacune. À la fin, je te donne ton niveau CECR et on commence pour de vrai.` | |
| step.n | `Étape {n}` | |
| step.names | `Première consigne`, `Deuxième consigne`, `Troisième consigne` | |
| caption | `Écris comme tu parles : le français de la Louisiane, c'est ça qui compte icitte. Tes brouillons sont gardés à mesure.` | |
| start | `Commencer` | |
| step.title | `Test de placement · étape {n} sur 3` | |
| progress.label | `Avancement du test` | `aria-label`; `aria-valuetext` `Étape {n} sur 3` **I** |
| next | `Consigne suivante` | step 3 label **I** (e.g. `Voir mon niveau`); busy label **I** (`Je lis ton texte…` is the natural fit) |
| done.title | `Test de placement · fini` | |
| done.label | `TON NIVEAU CECR · {LEVEL NAME}` | e.g. `· SEUIL` |
| done.summary | e.g. `Tu racontes et tu décris sans misère…` | **M** |
| done.step.summary | e.g. `Phrases simples, claires, presque pas de fautes.` | **M** |
| done.cta | `Ma première consigne` | |
| done.other | `Choisir un autre niveau` | |

---

## 6. Gaps and ambiguities

Owner decisions (blocking or likely to change copy/data):

1. **App name.** "Lâche pas." is a placeholder. It affects the wordmark, `<title>`, and metadata.
2. **Score dimension names and value format.** The mockup shows `Grammaire / Vocabulaire / Cohérence / Consigne suivie` with sub-level CEFR values (`A2+`, `B1+`). The app has four different dimensions (Register & Style, not "Consigne suivie") scored 1–6 with no `+`. Decide the French labels (proposal in §5) and whether to show the 1–6 score (`4 / 6`), map it to CEFR, or change the evaluator to output per-dimension CEFR.
3. **Existing `tips` (per-dimension + holistic "to reach B2…").** `CONTEXT.md` treats them as core to the Evaluation; the design has no slot for them. Options: inside the open Scores disclosure, a one-line holistic tip above the CTAs, or drop them. They are also English today and must become French.
4. **Weakness taxonomy.** Category ids, the four name forms (`name`, `inlineName`, `historyName`, `shortName`), and the mapping to Resource catalog categories. The mockups use four different spellings of the same Weakness.
5. **Resource catalog contents.** InnerFrench, Télé-Louisiane, and the grammar topics are stand-ins. Also: what happens when a category has no Resources (the `tranquille` row shows none)?
6. **Trend rule** for `actif` / `en progrès` / `tranquille`, and how many Focus Weaknesses (1 vs 2) and how they are chosen.
7. **Louisiana copy correctness.** All UI strings, sample corrections, and the tutor voice are unchecked against the DLF. Have someone review the copy table in §5 before shipping.
8. **Learner name** (`Bienvenue, Logan.`). There is no user/profile model. Drop the name, ask for it, or read it from config.
9. **Route slugs.** French (`/carnet`, `/historique`, `/placement`) vs keeping `/history`. This map assumes French with a redirect.
10. **Does the Placement Test consume the daily quota?** Not specified; assume no.
11. **Word target by level.** Every mock uses 250–300. That is wrong for A1/A2. The generator should own `wordRange` per CEFR level; the meter just reads it.
12. **Advancement threshold semantics** with Standard French: since Standard is never wrong, confirm the evaluator's `overall_cefr` doesn't penalize it either (prompt change).

Not drawn (implementers must assume; listed with the assumption this map makes):

13. **Mobile Dialect Note sheet.** Assume a bottom sheet at full width, max-height ~90vh, scrollable body, sticky footer, slides up.
14. **Level-change menu** (desktop and mobile). Assume a Base UI Menu anchored to the chip, six `menuitemradio` items `B1 · Seuil`.
15. **Desktop "returning user before generate" (A-ready).** Only mobile (ME) is drawn. Assume: date title, inline FocusLine, then a Surface with a short line plus primary `Donne-moi une consigne`. Or reuse the ME hero layout at 760px.
16. **Placement, Carnet, and History at 390px.** Pages are fluid. Assume Surface padding drops to 22px 18px and the History expanded indent (26px) drops to 0.
17. **Mobile breakpoint.** Not specified. Assume `< 640px` (Tailwind `sm`) for the two-row header, mobile type sizes, full-width buttons, and the stacked review.
18. **Focus styles.** No focus ring is drawn, and the textarea sets `outline: 0`. Assume a 2px primary outline with 2px offset globally. For the textarea, show a visible focus indicator on the sheet (e.g. `:focus-within` outline on the Surface).
19. **Mobile review omits the date title and FocusLine**, and uses h1 `Évaluation` (26px). Desktop keeps the date as h1 and `Évaluation` as h2. Assume the markup as drawn.
20. **Dismissed (`Compris`) Correction state.** Not drawn. Assume the card collapses to its header row + quote (muted), the mark stays, and the status persists.
21. **Post-save state of a resolved card** (after a Dialect Note is saved). Assume the card is replaced by one line `Note de dialecte sauvée` (**I** copy) with a link to the Carnet, and the summary counts update.
22. **Zero-corrections Evaluation.** Not drawn. The summary copy and an encouraging line are needed.
23. **Prompt-generation failure** alert copy; offline variant of DraftStatus; "saving…" state.
24. **Swap confirm placement.** Drawn as a standalone inline `alertdialog`. Assume it renders directly under the meta row inside the sheet, with focus moved to `Garder celle-là`.
25. **Quota CTA at 0** in review (`Une autre consigne · reste 0`). Assume disabled `Une autre consigne · à minuit`. Should the quota notice also appear in Phase C?
26. **`CONSIGNE D'ÉCRITURE · 3 SUR 3`** label appears only in HQ. Assume the index is shown only when the quota is exhausted (or always?). Pick one.
27. **History: abandoned-draft expanded content**; legacy sessions with no Focus (title fallback). Never title by truncated prompt alone, so assume `{genre} · {date}` from meta, or `Séance du {date}`.
28. **`/historique/[id]` full marked-up view.** Not drawn. Are actions live (can a learner still answer an old dialect check)? Assume read-only.
29. **Dialect Note edit/new modes** (no `T'as écrit` row for manual notes); **delete confirmation/undo**; when the `nouvelle` tag expires (assume 24h or the first Carnet visit after creation).
30. **"Pratiquer ça" feedback.** What the button shows after press, whether it replaces today's Focus immediately or only the next prompt, and whether a Weakness can be un-practiced.
31. **Empty states** for Carnet (both lists), History, and Focus (new learner: FocusLine hidden?).
32. **Placement:** label and busy state of the step-3 submit; whether "Ma première consigne" auto-generates (it says "my first prompt"; assume it lands on `/` and immediately generates); placement error/offline states.
33. **Word meter beyond `max`.** Fill caps at 100% (the scale max is the target max); nudge copy for over target and for other distances is not given. Never block.
34. **First-run generate with no level pressed.** Assume the button is disabled until a level is chosen (HE shows B1 pressed).
35. **KbdHint on non-Apple.** Only `⌘ ↵` drawn; assume `Ctrl ↵`.

Markup inconsistencies (pick one and move on):

36. Mobile meter track is `#D3DBD4`; the token `rule` is `#DCE3DD`. Use `rule`.
37. Canvas note says the sheet "slides up"; HANDOFF says "slides in" (right panel). Use right on desktop and up on mobile.
38. `Oui, c'est à nous-autres`, `Commencer`, `Consigne suivante`, `Sauver la note`, `Annuler`, and `Une autre consigne · reste N` are `<a>` in the markup only because the canvas navigates between artboards. Implement mutations/overlays as `<button>`, real navigation as links.
39. Resource links have `min-height: 32px` (36px mobile), below the stated 44px minimum touch target. They are inline links in a paragraph, which WCAG 2.5.8 permits (24px), but HANDOFF says 44 minimum. Recommend 44px on mobile, 32px desktop.
40. The dialect-check card quote (`mon petit cousin a tombé`) is wider than its mark (`a tombé`). Hence `contextQuote` in §4.1. The DN "T'as écrit" uses the mark text.
41. HR prompt meta in review is 13px; MR drops the meta entirely.
42. U+2011 (non-breaking hyphen) in `‑er / ‑é`. Check that the Newsreader and Bricolage subsets include it (`latin-ext` / General Punctuation). If not, the glyph falls back to Georgia/Trebuchet. Alternative: a plain hyphen wrapped in `white-space: nowrap`.
43. French typography: the mockups use a regular space before `?` `:` `»` and after `«`. Decide whether to use U+202F narrow no-break spaces (recommended to avoid line breaks before punctuation). Either way, apply it consistently in copy constants.

Codebase issues surfaced by the mapping (not design gaps, but they block the design):

44. `--font-sans` self-reference (§1.2); `<html lang="en">`; metadata still "Create Next App".
45. Quota day computed in UTC (`toISOString`), not local midnight (§4.10).
46. Placement and tracker counter state are in module memory; they are lost on restart, so "Finir plus tard" and advancement undo can't work (§4.9, §4.11).
47. `/api/evaluate` silently sets A2 if no level exists. With the design's first-run gate this should become an error.
48. `history-page.tsx` `JSON.parse`s in render. One malformed row crashes the page, which contradicts the History "never blank or crash" rule.
49. Evaluator and prompt-generator system prompts are English and ask for English output. The tutor must answer in French (Louisiana preferred) and produce Corrections (§4.1).
50. `CONTEXT.md` still says Evaluations "judge Student Writing against Louisiana French norms, not Standard French". The owner's decision (Standard is never wrong; it gets a suggestion) should be recorded there along with the new terms.

---

## 7. Suggested vertical slices (UI perspective)

Each slice is end-to-end (UI + the API/data it needs + tests), demoable, and targeted at under 500 lines of production code (tests excluded). Dependencies are listed by slice number.

1. **Foundation: tokens, fonts, primitives.** `globals.css` rewrite (§1, without `--color-*: initial` yet), `layout.tsx` fonts + `lang="fr"`, Button rewrite, ButtonLink, TextLink, Field, Surface, SectionLabel, PageTitle, KbdHint, reduced-motion + focus base styles. Restyle nothing else yet. *Deps: none.* Test: Button variants render with correct roles; `busy` sets `aria-busy` + disabled.
2. **App header + level menu + local-midnight quota.** AppHeader (full/placement variants, mobile two-row), QuotaText (all forms), LevelChip + LevelMenu (Base UI Menu, `PUT /api/level`), quota keyed by client time zone + `resetsAt` in `/api/quota`. Remove the old header from `page.tsx`/`history-page.tsx`. *Deps: 1.*
3. **Home Phase A + structured prompt + Phase B shell.** `/api/today` bootstrap (level, quota, active session); HomePage state machine A0/A-ready/B; LevelPicker; FirstRunIntro; PromptSheet with PromptMeta (generator returns `genre/tenses/wordRange/tone`); separate generate busy label; prompt fade-up. Replaces LevelCard + the generate half of PromptCard. *Deps: 2.*
4. **Writing surface.** RuledTextarea (auto-grow, ruled, `lang="fr"`, spellcheck off, ⌘/Ctrl+Enter), WordMeter, WritingFooter, SubmitButton (`Je lis ton texte…`), minimal Phase C placeholder that still shows the existing scores so nothing regresses. *Deps: 3.*
5. **Draft persistence.** `PUT /api/sessions/:id/draft`, `draftSavedAt` column, localStorage mirror, reconcile on load, DraftStatus with `21 h 42` formatting, restore into Phase B after reload. *Deps: 4.*
6. **Quota exhausted + swap with confirm + session statuses.** QuotaNotice with countdown, disabled swap `· à minuit`, ConfirmSwapDialog, `replaceSessionId` on generate marking `abandoned_draft`/`unused_prompt`. *Deps: 5.*
7. **Errors and offline.** ErrorAlert (evaluate + generate) with retry, OfflineNotice, `navigator.onLine` + fetch-failure handling, draft kept locally, no endless skeletons. *Deps: 5.*
8. **Corrections v1: Mistakes inline.** Evaluator prompt in French returning `corrections[]` (mistake kind only) with span validation; store in `evaluationJson`; ReviewLayout split/stacked; MarkedText (mistake marks + SR text); CorrectionCard mistake (without the resources/pushback action); EvaluationSummary; aria-live + focus move; ScoresDisclosure replacing EvaluationCard (dimension labels per decision §6.2); CTA `Une autre consigne · reste N`. *Deps: 4 (and decision 2).* Likely the largest slice; if it exceeds 500 lines, split the evaluator/schema change from the UI.
9. **Standard→Louisiana with DLF.** DLF lookup module over `canonical.jsonl` (headword/forms → entry id), `standard` kind in the evaluator output (dropped unless a DLF form exists), dashed mark + outlined marker, card with `DLF` badge, `Compris` persistence (`POST /api/corrections/:id`). Never counted. *Deps: 8.*
10. **Dialect check + Dialect Notes (create) + sheet.** `dialect_check` kind with `contextQuote`/`dialectDraft`; wavy mark + squared marker; `Non, corrige-le` → converted mistake; DialectNoteSheet (desktop panel + mobile bottom sheet, focus trap, slide motion); `POST /api/dialect-notes` resolving the Correction; mistake pushback `C'est du français louisianais`; evaluator receives notes and suppresses matches. *Deps: 8.*
11. **Carnet: Dialect Notes list (read/edit/delete).** `/carnet` page shell, DialectNoteRow, `Ajouter une note` (new mode), `Modifier`, `Supprimer` with confirm/undo, `nouvelle` tag. *Deps: 10.*
12. **Weakness memory + Carnet "À travailler" + Resources.** Category taxonomy + curated Resource catalog (static module), Weakness aggregation from Corrections (excluding standard, including converted, minus pushed back), trend, CarnetWeaknessRow, ResourceLinks on mistake cards and Carnet rows. *Deps: 8, 11 (page shell); decisions 4–6.*
13. **Focus du jour.** Focus computation per local day, FocusLine (inline/stacked/hero), Focus fed into the prompt generator, `matchesFocus` + `focus du jour` tag, `Pratiquer ça` (`POST /api/weaknesses/:id/practice`), review CTA `« ‑er / ‑é » dans le Carnet →` with anchor. *Deps: 12, 3.*
14. **History redesign.** Defensive `/api/sessions` with per-row `dataIssue`, HistoryRow (3 statuses + malformed, error boundary per row), expanded content with corrections summary, LevelProgressionLine, French dates, `/historique` route + redirect. *Deps: 6 (statuses), 8 (corrections summary); can ship before 8 with an evaluated-only summary.*
15. **Read-only session review.** `/historique/[id]` reusing ReviewLayout/MarkedText/cards without actions. *Deps: 14, 10.*
16. **Level advancement banner + undo.** Persisted tracker counter, pending advancement in bootstrap, AdvancementBanner, `POST /api/level/undo`, cleared on generate. *Deps: 3.*
17. **Placement Test redesign.** Persisted placement state, `/placement` route (start/step/done), PlacementProgress, step uses RuledTextarea + WordMeter (no target) + drafts, PlacementResult with per-step summaries (French), first-run-only gating, `Ma première consigne`. Replaces PlacementTestCard. *Deps: 4, 5.*
18. **Cleanup + motion polish.** Delete the old components, enable `--color-*: initial`, the marks-paint motion, a 390px pass across all pages, and an axe/Testing Library a11y sweep (roles, labels, focus return). *Deps: all UI slices.*

Critical path to the core redesigned loop: 1 → 2 → 3 → 4 → 8. Slices 5–7 make it robust; 9–10 deliver the three-kind Correction model; 11–13 deliver memory (Carnet + Focus); 14–17 are independent after their listed deps.
