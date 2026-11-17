# D04 — Learner-dialect context

| Phase  | Type | Blocked by    | Production lines (est.) |
| ------ | ---- | ------------- | ----------------------- |
| Deepen | AFK  | D02 preferred | ~200–350                |

## User stories

- As a maintainer, I want one learner-dialect context for generate and evaluate, so Louisiana rules, Dialect Notes, and DLF are not threaded three different ways.

## What to build

Build `LearnerDialectContext` (rules + active notes + DLF handle) once per request; pass into generator and evaluator. Delete redundant ad hoc `listActiveNotes` / render imports from those pipelines. See `docs/plan/deepenings.md`.

## Acceptance criteria

- [ ] `[unit]` confirmed Dialect Note forms are not Mistaken when context includes notes
- [ ] `[unit]` generator and evaluator accept the same context type
- [ ] `[check]` pr:size under 500

## Tests to write first

- `LearnerDialectContext › active notes suppress dialect Mistakes`
- `evaluate › uses context notes without a second notes fetch in the route`

## Out of scope

Notes CRUD UI. Changing Louisiana rule content.

## References

`CONTEXT.md` › Dialect Note, Louisiana French, DLF, French Dialect
