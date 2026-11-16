# T13e — Mobile header rows + level card sync after legacy PUT

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T13c       | ~60                     |

Post-merge **blocking** adversarial review on [PR #54](https://github.com/logandelafosse/french-writing-prompter/pull/54) (2026-11-15). Does not block T14 if scheduled parallel; fixes learner-visible header defects on `main`.

## User stories

- As Logan on a phone, I want the header in two rows (wordmark + chip, then Historique + compact quota), not three stacked bands.
- As Logan, when I change level on the legacy card, the badge must not flash back to the old level while `refreshShell` runs, and must not stay wrong if refresh fails after a successful PUT.

## What to build

### Mobile layout (`< 640px`)

T13 / implementation-map §2.2: row 1 = wordmark (no tagline) + level chip; row 2 = nav + compact quota. Today `flex-col` stacks wordmark, chip, and nav/quota as three siblings (`header-shell.tsx`).

Restructure mobile markup so chip sits on row 1 with wordmark (e.g. nested flex row for row 1, row 2 unchanged). Desktop `sm:` single-row behaviour from T13c must not regress.

### `LevelCard` after `handleSelectLevel`

- Do not render `shellLevel ?? data?.level` in a way that prefers stale `shellLevel` over `data.level` immediately after a successful PUT.
- Options: optimistic `data.level` wins until shell catches up; or `refreshShell` updates level from PUT response without waiting on a racing GET.
- Add unit/e2e that selects level on the **card** (not only chip), without mocking `HeaderShell` away.

## Acceptance criteria

- [ ] [e2e] 390 px: exactly two header rows; tagline hidden; compact quota on row 2 with chip on row 1 (capture in `docs/evidence/55/` or update `53/` on branch).
- [ ] [e2e] Change level on legacy card; badge shows new level without reverting to old during load; chip matches.
- [ ] [e2e] 1280 regression: one-row header unchanged.
- [ ] [check] `npm run check` green; `pr:size` under 500.

## Out of scope

- Level GET generation guard (adversarial non-blocking #1) — optional follow-up with quota-style gen counter.
- T13d e2e hardening roster (#55).

## References

- Adversarial review PR #54 (blocking items 1–2).
- `docs/plan/tickets/T13-app-header-level-menu-quota.md` mobile rows.
