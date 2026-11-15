# T35 — Cleanup, motion, 390 px pass, a11y sweep

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 4 | AFK | T13–T34 UI tickets | ~450 (mostly deletions and CSS); see split note below |

## User stories

- As Logan the maintainer, I want the legacy components, dead routes and default Tailwind palette gone, so that agents can only build with the design tokens and new primitives.
- As Logan the learner, I want the marks to paint across my text when an Evaluation arrives (and stay still if I ask for reduced motion), and every page to work at phone width and by keyboard, so that the app feels finished on any device.
- As Logan the maintainer, I want a README that says what the app is and how to run it, so that I (or an agent) can start it cold.

## What to build

1. **Delete legacy code.** Remove everything listed in `implementation-map.md` §2.10 that still exists: `prompt-card`, `evaluation-card`, `level-card`, `LEVEL_COLORS`, `history-page`, the old Button variants, and the `POST /api/evaluate` alias. Also remove the in-memory tracker and quota stores if any remain, and every route, export or file knip reports as unused. The `/history` redirect from T31 stays.
2. **Strict tokens.** Enable `--color-*: initial` in `globals.css` so only `--color-<token>` utilities exist. Add an ast-grep rule that rejects default-palette class names (`zinc-`, `emerald-`, `slate-`, `gray-`, etc.) and raw hex colours in `className` and inline `style` in `src/`.
3. **Motion 2, marks paint.** When an Evaluation arrives in Home Phase C, the marks paint left to right in text order: the underline and fill grow from 0 to 100%, staggered about 60 ms per ordinal. It does not play when Phase C is restored on reload or on `/historique/[id]`. Under `prefers-reduced-motion: reduce`, nothing animates; check motions 1 (prompt fade-up) and 3 (Dialect Note sheet slide) too.
4. **390 px pass.** Cover Carnet, Historique, `/historique/[id]`, and the three Placement screens, plus a regression check on Home phases A, B and C. Surfaces drop to `22px 18px` padding, the History expanded indent drops to 0, primary buttons go full width at 54 px, and inline Resource links reach 44 px (gap #39).
5. **a11y and keyboard sweep.**
   - Every route passes axe at both widths.
   - Escape closes the level menu, the Dialect Note sheet and the swap confirmation, and focus returns to the control that opened it.
   - After a Correction action, focus moves to the next open card.
   - A visible 2 px primary focus ring with a 2 px offset appears on every focusable element, and on the sheet via `:focus-within` for the textarea (gap #18).
6. **French typography.** Adopt U+202F (narrow no-break space) before `?` `!` `:` `;` `»` and after `«` in all UI copy constants (gap #43, recommended option). Add a check that fails on a regular space in those positions in French string literals under `src/`. Confirm Newsreader and Bricolage include U+2011; if not, use a plain hyphen inside `white-space: nowrap` (gap #42). Update Playwright selectors to read from the copy constants rather than hand-typed strings.
7. **README.** Replace the create-next-app boilerplate with:
   - What the app is: a Louisiana French writing tutor with three consignes per day, CEFR Level, Corrections in three kinds, Carnet, and Placement Test.
   - Prerequisites (Node version, `OPENAI_API_KEY`, optional `APP_TIME_ZONE` and `DLF_CANONICAL_PATH`).
   - Commands: `npm run dev`, `npm run db:migrate`, `npm run check`, the Playwright command, `LLM_FAKE=1` for offline dev, `npm run dialect:export`, and the DLF index build.
   - Pointers to `CONTEXT.md`, `docs/plan/` and `docs/design/handoff/`.

## Acceptance criteria

- [ ] `[check]` `knip` reports zero unused files, exports and dependencies. No file from the §2.10 "Current" column remains, except `page.tsx` as the thin wrapper.
- [ ] `[check]` `globals.css` contains `--color-*: initial`. `npm run build` passes. The new ast-grep rule passes on `src/` and fails on a fixture containing `bg-zinc-100` and `style={{ color: "#333" }}`.
- [ ] `[unit]` `MarkedText` with `animate` sets increasing per-mark delays by ordinal. Without `animate` it sets no animation.
- [ ] `[e2e]` On submit in Home, marks have a non-`none` `animation-name` with increasing `animation-delay`. With `reducedMotion: 'reduce'` emulated, `animation-name` is `none` on marks, the prompt and the Dialect Note sheet. After a reload in Phase C, marks have no animation.
- [ ] `[e2e]` At 390 px, every route listed in step 4 has `document.documentElement.scrollWidth <= 390`, and every `button` and non-inline `a` has a bounding box at least 44 px tall.
- [ ] `[e2e]` axe reports zero serious or critical violations on `/`, `/carnet`, `/historique`, `/historique/[id]` and `/placement` (all three phases) at 1280 and 390 px.
- [ ] `[e2e]` Keyboard only: open the level menu, the Dialect Note sheet and the swap confirmation. Escape closes each one, and `document.activeElement` returns to its trigger. Tab never escapes the open sheet.
- [ ] `[e2e]` Every focusable element shows a non-`none` outline when focused by keyboard.
- [ ] `[check]` The typography check passes on `src/` and fails on a fixture string `"Ça se dit comme ça ?"` that uses a regular space.
- [ ] `[unit]` A test asserts that every `npm run <script>` named in `README.md` exists in `package.json`, and that the README no longer contains `create-next-app`.

## Tests to write first

- `MarkedText › stagger delays only when animate is set`
- `ast-grep no-default-palette › flags zinc class and raw hex style`
- `typography check › flags regular space before question mark`
- `readme › documented scripts exist`
- `motion.spec › marks paint on arrival, not on reload, none with reduced motion`
- `mobile.spec › no horizontal scroll and 44 px targets on all routes at 390`
- `a11y.spec › axe clean on every route at both widths`
- `keyboard.spec › Escape closes overlays and returns focus`

## Out of scope

- New features or copy beyond what earlier tickets defined. Missing copy found during the sweep becomes a Backlog ticket.
- Owner review of Louisiana copy correctness (gap #7). That is a separate owner task.
- Renaming the app (Q3).

## References

- `HANDOFF.md` › Motion, Accessibility, Design tokens, Shape and spacing
- `implementation-map.md` §1.3–1.5 (`--color-*: initial`, base layer, reduced motion), §2.4 (MarkedText motion 2), §2.10, §6 gaps #16, #18, #36–43, §7 slice 18
- `docs/agents/tooling-review.md` (ast-grep, knip, Playwright axe setup)
- `docs/agents/workflow.md` › Playwright gate

**Split note:** if the diff exceeds 500 lines, split it into **T35a**, covering deletion, strict tokens, the palette rule and typography (mechanical changes, items 1, 2 and 6), and **T35b**, covering motion, the 390 px pass, the a11y and keyboard sweep and the README (items 3, 4, 5 and 7).
