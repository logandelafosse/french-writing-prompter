# T21b — Evaluator v2 runtime, routes, and fixtures

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T21a       | ~450                    |

Closes **#23** when merged. Depends on T21a contracts, migration, and `parseStoredEvaluation`.

## User stories

- As Logan, submit still runs Evaluator v2, persists Corrections, and Phase B keeps the placeholder Evaluation card with scores (no T22 UI yet).

## What to build

Per `T21-evaluator-v2-corrections.md` **except** what T21a already landed:

- `locateQuote`, `postProcessEvaluation`, `buildEvaluatorPrompt` / `evaluator@2`
- Fixtures in `src/modules/writing-evaluator/__fixtures__/`
- `POST /api/sessions/:id/evaluate`; thin `/api/evaluate` alias
- Persist EvaluationV2 + correction rows; advancement unchanged
- Fake AI client: e2e serves `ok-mixed-kinds`
- Client: map EvaluationV2 → existing placeholder `EvaluationCard` (no review redesign)
- E2e: Phase B submit at 1280 px still shows scores

## Acceptance criteria

Carry over remaining items from parent T21 ticket (locateQuote table, overlapping quotes, kind invariants, prompt French, fixture snapshots, route 409, etc.).

## References

- Parent: `docs/plan/tickets/T21-evaluator-v2-corrections.md`
- WIP reference: `ticket/t21-evaluator-v2` worktree after T21a merges
