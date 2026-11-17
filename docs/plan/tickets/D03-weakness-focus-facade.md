# D03 — Weakness / Focus façade

| Phase  | Type | Blocked by | Production lines (est.) |
| ------ | ---- | ---------- | ----------------------- |
| Deepen | AFK  | None       | ~200–350                |

## User stories

- As a maintainer, I want one Focus/Weakness board call, so prompt, weaknesses API, and today stop assembling `listRanked` + pin + `computeFocus` by hand.

## What to build

Façade over `src/modules/weakness-service` returning ranked Weaknesses, pending Practice Pin, and live Focus ids. Update `GET /api/weaknesses`, `src/server/today`, and (if D01 not merged yet) prompt route. See `docs/plan/deepenings.md`.

## Acceptance criteria

- [ ] `[unit]` façade matches current composed behaviour (including `autre` exclusion)
- [ ] `[integration]` three callers no longer import four weakness files each
- [ ] `[check]` pr:size under 500

## Tests to write first

- `weaknessBoard › ranks and exposes pending pin`
- `currentFocus › live ids for home snapshot`

## Out of scope

Prompt txn/issuance (D01). Carnet UI redesign.

## References

`CONTEXT.md` › Weakness, Weakness Trend, Focus du jour, Practice Pin
