# T13d — T13c e2e and acceptance hardening

GitHub issue: #55

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T13c       | ~40 (tests/fixtures)    |

Spawned by [test review](https://github.com/logandelafosse/french-writing-prompter/pull/54) after [PR #54](https://github.com/logandelafosse/french-writing-prompter/pull/54) merged. Unit coverage exists for stale quota and level sync; e2e does not yet prove the T13c acceptance rows end-to-end.

## What to build

- **E2e level sync:** After chip change via keyboard, assert legacy `LevelCard` (or its visible level label) matches chip — not duplicate `getByText(/C1/)` counts.
- **E2e stale quota after generate:** Route stub or delayed `GET /api/quota` so an older `remaining: 3` cannot appear after generate; assert `Reste 2 consignes sur 3`.
- **E2e 1280:** Assert wordmark `Consigne`; optional layout assert for single-row header at ≥640px.
- **E2e 390:** Assert long quota hidden when compact shown; two-row structure if stable in Playwright.
- **Unit:** `LevelMenu` fires invalid value — `onChange` not called (not only `nextLevelFromMenuValue` in isolation).
- **Check:** Optional lint/ast-grep or knip guard: no `quota-store` `QuotaState` import in `src/components` (see tooling backlog).

## Acceptance criteria

- [ ] [e2e] Each gap called out in T13c test review is covered or explicitly waived with reason on the ticket.
- [ ] [check] `npm run check` and e2e green.

## Out of scope

- Production header behaviour changes (unless a test exposes a real bug — open T13e).
- Tooling rule packs (separate TOOL-PR54-* tickets).

## References

- `docs/plan/tickets/T13c-header-pr52-review-fixes.md`
- PR #54 test review (2026-11-15)
