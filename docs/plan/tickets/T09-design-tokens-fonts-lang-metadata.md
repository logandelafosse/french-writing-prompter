# T09 — Design tokens, fonts, `lang="fr"`, metadata

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 0 | AFK | T02 | ~200 (mostly `tokens.css`) |

## User stories

- As an agent building a redesign component, I want every HANDOFF colour, radius, shadow, width and type size available as a Tailwind token (`bg-sheet`, `text-ink`, `rounded-base`, `max-w-home`, `text-prompt`), so that I never type a hex value or guess a size.
- As Logan as learner, I want the app to load Bricolage Grotesque and Newsreader, declare French, and show its real name in the tab, so that it reads correctly in screen readers and stops looking like a scaffold.
- As Logan as maintainer, I want a test that fails when someone changes a colour below 4.5:1 contrast or reintroduces a self-referencing font variable, so that design regressions are caught by `npm run check`.

## What to build

`src/styles/tokens.css`, imported by `globals.css`, is the only file holding colour literals. It declares the Tailwind 4 `@theme` from `implementation-map.md` §1.4: colours, radii, shadows, containers, touch/button spacing and the type scale. One exception: `--color-*: initial` is **not** added yet, because the legacy UI still uses the default palette (T35 adds it). The body's dot-grain and highlight gradients from §1.5 reference tokens or live in `tokens.css`, so `globals.css` has no raw `rgb()`.

The shadcn scaffold goes, as listed in §1.3: the `:root` and `.dark` blocks, the dark variant, the colour aliases, the derived radii and the base `@apply` lines. Keep the `tailwindcss`, `tw-animate-css` and `shadcn/tailwind.css` imports.

Fonts come from `next/font/google`, as in §1.1. Bricolage Grotesque is exposed as `--font-bricolage` and Newsreader (with italic) as `--font-newsreader`, both with `latin-ext`. `@theme inline` maps them as `--font-sans: var(--font-bricolage), "Trebuchet MS", sans-serif` and `--font-serif: var(--font-newsreader), Georgia, serif`. This fixes the self-referencing `--font-sans`, and Tailwind's preflight then gives the UI font to all text by default.

Token names follow `implementation-map.md` (`--radius-base`, `font-sans`/`font-serif`). Where `tooling-review.md` §9 says `--radius-DEFAULT`, `font-ui` or `font-prose`, the map wins, because T10 builds against these names.

`layout.tsx` drops Geist and sets `<html lang="fr">`. `metadata` uses the title `Lâche pas.` and the description `atelier d'écriture · français louisianais` (placeholder pending Q3). The base layer sets `html { font-sans; text-ink }` and the desk background. Focus ring and reduced-motion base styles belong to T10.

The raw-colour ast-grep rules apply everywhere outside `legacy/`. Whichever of T07 and T09 merges second adds `no-scaffold-leftovers`.

## Acceptance criteria

- [ ] `[unit]` Token contract test passes. Every HANDOFF colour token exists in `tokens.css` with the exact hex.
- [ ] `[unit]` No custom property in `tokens.css` or `globals.css` is defined as `var()` of itself, directly or through a chain.
- [ ] `[unit]` Every one of these text pairs is ≥ 4.5:1: ink, ink-2, muted, disabled-text, primary, mistake, standard and dialect on sheet; muted and primary on desk; muted and ink-2 on notice; primary and busy on primary-tint; white on primary, busy, mistake and dialect; standard on white; ink and mistake on mistake-tint; ink and dialect on dialect-tint.
- [ ] `[unit]` Compiling `globals.css` with Tailwind's Node API for `bg-sheet text-ink font-sans font-serif rounded-base shadow-sheet max-w-home text-prompt` emits declarations that resolve to the token values (no default-palette fallback).
- [ ] `[check]` `npm run build && npm start` serves `/` with `<html lang="fr"`, `<title>Lâche pas.</title>`, and the description meta; the `<html>` class list includes both next/font variable classes; no `Geist` string remains in `src/`.
- [ ] `[check]` `rg -n '#[0-9a-fA-F]{3,8}\b|oklch\(|rgba?\(' src --glob '*.css'` matches only `src/styles/tokens.css`; if T07 has merged, `npm run lint:ast` passes.
- [ ] `[check]` `npm run check` is green; the legacy Home and History still render (manual `npm run dev`).

## Tests to write first

- `src/styles/tokens.test.ts` (about 60 lines, no new runtime deps): parse `tokens.css`. Then: "every HANDOFF token has its exact hex", "no custom property references itself", "every text pair used by HANDOFF meets 4.5:1" (table-driven over the pairs above).
- `src/styles/theme.test.ts`: compile `globals.css` with Tailwind's Node API for a fixed candidate list and assert the emitted declarations ("bg-sheet uses --color-sheet", "font-sans starts with the Bricolage variable").
- Write a failing case first by pointing the test at the current `globals.css` (self-referencing `--font-sans`).

## Out of scope

- `--color-*: initial` and removing the default palette (T35).
- Focus ring, reduced-motion base, any component or primitive (T10).
- Restyling any screen (T13 onward).
- Final app name (Q3, T13).

## References

- `docs/design/handoff/HANDOFF.md` "Design tokens".
- `docs/design/implementation-map.md` §1.1–1.5 (fonts, the `--font-sans` bug, removals, the full `@theme`, contrast table), §6 gaps #1, #42, #44.
- `docs/agents/tooling-review.md` §4 (`no-raw-color*`, `no-scaffold-leftovers`), §9, §12 TOOL-9.
