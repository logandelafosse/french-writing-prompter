# T13c — Header PR #52 review fixes

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T13        | ~120                    |

Spawned by Grok 4.7 reviews on [PR #52](https://github.com/logandelafosse/french-writing-prompter/pull/52) after merge. **T13b h1 + axe** (`page-has-heading-one`) already landed on `main`; this ticket closes the remaining **blocking** adversarial and test findings without waiting for T35.

## User stories

- As Logan, I want the legacy level card and the header chip to show the same CEFR level, so that I trust what the next prompt will use.
- As Logan, I want the header quota to stay correct after I generate a prompt, so that a slow network response cannot rewind the count.

## What to build

**Client state (`header-shell.tsx`, `level-card.tsx`, `prompt-card.tsx`)**

- Sync level: when the header chip changes level, the home `LevelCard` reflects the same level (prefer `useHeaderShell` / shared context over `window` events for level; keep or narrow `HEADER_SHELL_REFRESH_EVENT` to quota-only if still needed).
- Quota fetch serialization: ignore stale `GET /api/quota` responses (request generation or abort) so a late response cannot overwrite `refreshQuota` after generate.
- Loading / error: do not render first-run quota (`3 consignes aujourd'hui`) or a fake full quota when level or quota is still loading or failed; use null/ skeleton until `ok`, or surface existing error patterns from T19 later.
- `LevelMenu` `onValueChange`: parse with `parseCefrLevel` (or equivalent), not `as CefrLevel`.
- `QuotaState` type in UI comes from `z.infer<typeof QuotaGetResponse>` in `src/contracts/api.ts`, not a parallel type from `quota-store`.

**Layout & a11y (implementation-map §2.2)**

- From **640px** up: one wrapping header row (wordmark + tagline + chip + nav + quota), not a permanent two-row stack.
- `Historique` nav link meets **44px** touch target (`min-h-touch`; do not override with `min-h-9`).

**E2e**

- Keyboard path: arrow to `C1 · Autonome`, **Enter** (not click); after Escape, assert menu closed and chip focused.
- 1280 quota spec: assert wordmark visible; after generate, assert quota `Reste 2…` without full reload (e.g. `reload` flag or navigation guard).
- 390 spec: assert long quota hidden and compact visible; layout rows as ticket T13.
- Consolidate duplicated helpers (`setLevelB1`, quota visibility); drop redundant `playwright.config.ts` `testIgnore` if desktop quota moves into one spec with `test.use` viewport 1280.

Optional non-blocking from reviews (only if under line budget): merge `e2e/header-quota-desktop.spec.ts` into `header-quota.spec.ts`; `quota-text.test.tsx` renders `QuotaText` component for all forms.

## Acceptance criteria

- [ ] [e2e] Level chip change updates legacy `LevelCard` to the same level without reload.
- [ ] [e2e] After generate, quota shows `Reste 2 consignes sur 3` even if a slower prior `GET /api/quota` completes afterward.
- [ ] [e2e] 1280: single-row header at ≥640px; wordmark + tagline + chip + nav + long quota visible.
- [ ] [e2e] 390: two rows; compact quota only; tagline hidden.
- [ ] [e2e] Level menu keyboard: Enter selects; Escape closes menu; axe with `LEGACY_AXE_DISABLED` only (no `page-has-heading-one` waiver).
- [ ] [unit] `LevelMenu` value change rejects invalid levels at the callsite.
- [ ] [check] No `import type { QuotaState } from "@/modules/quota-manager/quota-store"` in `src/components`.

## Tests to write first

- Stale quota response does not regress UI after `refreshQuota`
- Level card reads header level after chip change
- e2e keyboard level menu (Enter + menu closed after Escape)

## Out of scope

- New Home shell (T14).
- Tooling rules from the PR #52 tooling review (file as separate tooling backlog; do not expand this ticket into eslint/ast-grep pack).
- Rust full stop on wordmark (non-blocking Q3 polish).
- Vercel / hosting (Phase 5).

## References

- PR #52 adversarial, test, and tooling reviews (2026-11-15).
- `docs/plan/tickets/T13-app-header-level-menu-quota.md` (criteria still owed on `main`).
- `implementation-map.md` §2.2 Shell.
