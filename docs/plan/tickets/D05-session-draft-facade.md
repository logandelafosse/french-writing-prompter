# D05 — Session / Draft façade

| Phase  | Type | Blocked by  | Production lines (est.) |
| ------ | ---- | ----------- | ----------------------- |
| Deepen | AFK  | D01 helpful | ~300–450                |

## User stories

- As a maintainer, I want Session/Draft lifecycle behind a small Interface, so Home and Carnet stop reinventing history-store CRUD rules.
- As Logan, I want drafts, review restore, and history behaviour unchanged.

## What to build

Façade verbs: open/save Draft, load Session for review, list views as needed. `history-store` remains the persistence Adapter. Shrink `HomePage` orchestration; split UI if pr:size blows. See `docs/plan/deepenings.md`.

## Acceptance criteria

- [ ] `[unit]` draft save + active/evaluated/abandoned rules through the façade
- [ ] `[unit]`/`[e2e]` Home still restores Draft and Phase C
- [ ] `[check]` pr:size under 500 (split D05b if needed)

## Tests to write first

- `sessionFacade › saves draft on active session only`
- `sessionFacade › load for review returns Evaluation + Corrections`

## Out of scope

New Carnet features. Placement Sessions (already under PlacementService).

## References

`CONTEXT.md` › Session, Draft, Student Writing, Carnet
