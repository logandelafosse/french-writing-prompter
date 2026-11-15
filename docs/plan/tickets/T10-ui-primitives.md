# T10 — UI primitives

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 0     | AFK  | T09        | ~350                    |

## User stories

- As an agent building a redesign screen, I want `Button`, `ButtonLink`, `TextLink`, `Field`, `Surface`, `SectionLabel`, `PageTitle` and `KbdHint` already built to the HANDOFF spec, so that every screen gets the same focus ring, 44 px targets, busy state and label wiring without my re-deriving them.
- As Logan as learner using a keyboard or screen reader, I want a visible focus ring everywhere, busy buttons announced as busy, and every field labelled, so that the app is usable without a mouse.

## What to build

Primitives live in `src/components/ui/`, built on the T09 tokens (no raw colours, no default palette). Each follows `implementation-map.md` §2.1.

- **Button**: rewrite `ui/button.tsx`, or recreate it if T06's knip pass deleted it, re-adding `class-variance-authority` and `@base-ui/react` if they were removed. It is always a real `<button type="button">` unless the caller passes `type="submit"`.
  - Variants: `primary`, `secondary`, `secondary-strong`, `outline-primary`, `outline-dialect`, `dialect`, `text`, `quiet`, `quiet-ink`.
  - Sizes: `md` (44), `lg` (48), `block-mobile` (54, full width).
  - `busy` sets `disabled`, `aria-busy="true"` and the busy background. The caller supplies the busy label. There is no shared `loading` flag.
  - Disabled uses `disabled-text` and `cursor: not-allowed`.
- **ButtonLink**: `next/link` with the Button variants, for navigation only.
- **TextLink**: inline link with `min-h-touch` by default, primary colour and hover.
- **Field**: label + control wiring. It generates an id, sets `htmlFor`/`id`, and links an optional hint through `aria-describedby`. The child is the control element.
- **Surface**: the sheet (`bg-sheet`, `line` border, `rounded-base`, `shadow-sheet`) with the padding presets from §2.1 and a no-shadow `card` variant.
- **SectionLabel**: polymorphic `span`/`h2`/`label`/`legend` in the label style. Text is written in sentence case and uppercased with CSS. Tone is `muted`, `primary` or `dialect`.
- **PageTitle**: `h1` at `text-page-title`, with a `step` size.
- **KbdHint**: `⌘ ↵` on Apple platforms and `Ctrl ↵` elsewhere, 13 px muted, `aria-hidden`, hidden below the mobile breakpoint. Platform detection must not cause a hydration mismatch: render a stable server value and update after mount, e.g. with `useSyncExternalStore`.

`globals.css` base layer gains a global `:focus-visible` ring (2 px primary, 2 px offset; gap #18) and the `prefers-reduced-motion` reset from §1.5. Touch targets follow gap #39: interactive primitives default to ≥ 44 px, and a smaller size must be an explicit opt-in prop.

No existing screen is restyled and no legacy component switches to the primitives. Primitives have no consumers yet besides their tests.

## Acceptance criteria

- [ ] `[unit]` Every Button variant renders a `button` (found by role) with `type="button"` by default; `type="submit"` is honoured.
- [ ] `[unit]` `busy` makes the button disabled with `aria-busy="true"`; clicking a busy button does not call `onClick`; a non-busy button never has `aria-busy`.
- [ ] `[unit]` `ButtonLink` renders a `link` with the given `href`; `TextLink` renders a `link`.
- [ ] `[unit]` `Field` with a text input and a hint: `getByLabelText(label)` returns the input, and its accessible description is the hint; two Fields on one page get distinct ids.
- [ ] `[unit]` `SectionLabel as="legend"` inside a `fieldset` gives the group its accessible name, with the sentence-case text in the DOM.
- [ ] `[unit]` `KbdHint` shows `⌘ ↵` when the platform is Apple and `Ctrl ↵` otherwise; it is hidden from the accessibility tree.
- [ ] `[unit]` `globals.css` contains a `:focus-visible` rule using `--color-primary` and a `prefers-reduced-motion: reduce` block. Assert this against the Tailwind-compiled output, reusing T09's helper.
- [ ] `[check]` `npm run check` is green. `knip` passes without adding the primitives to an ignore list. `no-raw-interactive-element` still exempts only `ui/` and `legacy/`.

## Tests to write first

One `*.test.tsx` per primitive in the jsdom project, using roles and labels only.

- "button is a real button and defaults to type=button"
- "busy button is disabled, announces aria-busy, and ignores clicks"
- "field associates its label and hint with the control"
- "section label as legend names its fieldset"
- "kbd hint shows the Apple or Ctrl shortcut and is aria-hidden"
- "button link navigates to its href"
- "base styles define a focus-visible ring and a reduced-motion reset"

Don't assert class names for visual variants (that tests implementation). Visual fidelity is checked by Playwright screenshots in T13+, when the primitives first appear on a screen.

## Out of scope

- IconButton, TextArea, Select, RuledTextarea, Menu, Dialog (built in the tickets that first need them: T13, T16, T25).
- Restyling Home, History or Placement (T13 onward).
- `--color-*: initial` (T35).

## References

- `docs/design/implementation-map.md` §2.1 (each primitive's spec), §1.5 (base layer), §6 gaps #18 (focus styles), #35 (KbdHint), #38 (button vs link), #39 (touch targets).
- `docs/design/handoff/HANDOFF.md` "Shape and spacing", "Accessibility".
- `docs/agents/tooling-review.md` §4 `no-raw-interactive-element`, `no-boolean-loading-state`.
