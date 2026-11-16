# T13f — Level card vs stale `GET /api/level`

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T13e       | ~40                     |

Merged [PR #57](https://github.com/logandelafosse/french-writing-prompter/pull/57) did not fully satisfy T13e acceptance (post-merge test review) — after PUT, `displayLevel` still prefers stale `shellLevel` when it disagrees with `data.level`; `refreshShell` has no fetch generation like quota; `syncFromShell` effect can refetch-loop.

## What to build

- **Header:** `levelFetchGen` (mirror `quotaFetchGen`) on `loadAll` / `refreshShell`; ignore stale level responses after `onLevelChange` / optimistic PUT.
- **Level card:** `displayLevel` must not show old level after successful PUT while shell catches up; on `refreshShell` failure, keep card on PUT result.
- **Tests:** Unmocked or integration path — card select level with delayed/stale `GET /api/level`; assert badge and chip stay on new level through refresh.
- **E2e:** Extend `level-card-header.spec.ts` with network delay fixture if needed (fake AI pattern: route stall, not wall-clock sleep in unit tests).

## Acceptance criteria

- [ ] [unit] Stale level GET after PUT does not regress chip or card badge.
- [ ] [e2e] Card level change: no flash to previous level during refresh.
- [ ] [check] Green; no new `vi.mock("@/components/shell/header-shell")` for sync tests.

## Out of scope

- Removing legacy `LevelCard` (T14 may reduce reliance).
- Re-layout mobile header (T13e met).

## References

- T13e ticket + PR #57 test review.
- Tooling: TOOL-PR57-3, TOOL-PR57-4.
