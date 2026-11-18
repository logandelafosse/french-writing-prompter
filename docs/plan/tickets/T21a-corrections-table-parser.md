# T21a — Corrections table, EvaluationV2 contracts, and parseStoredEvaluation

GitHub issue: #23

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 1     | AFK  | T06, T17   | ~230                    |

Parent: **T21** ([#23](https://github.com/logandelafosse/french-writing-prompter/issues/23)). This slice unblocks T21b; it does **not** close #23.

Split from `T21-evaluator-v2-corrections.md` when full T21 exceeded `pr:size` (~840 prod lines). Runtime evaluator, routes, and fixtures are **T21b**.

## User stories

- As Logan, stored evaluations and future Corrections rows have a stable schema and migration before the new evaluator ships.
- As Logan, History and read paths never crash on legacy v1, v2, or malformed `evaluation_json`.

## What to build

- **Contracts:** `MistakeCategory`, `Correction`, `countsAsMistake`; extend `evaluation.ts` with `EvaluationV2`, `EvaluatorOutputSchema` (strict nullable fields), `parseStoredEvaluation` (v2 / v1 / malformed / none; never throws).
- **DB:** `corrections` table + `evaluation_raw` on sessions via generated migration (`drizzle/0005_*`).
- **History store:** read path uses `parseStoredEvaluation` so v2 rows are not treated as malformed.
- **CONTEXT.md:** Evaluation includes Corrections; Standard French is never wrong (glossary / dialogue per parent ticket).
- **No** new evaluate route behavior, **no** `locateQuote` / `postProcessEvaluation` / prompt v2 in this PR (T21b).

## Acceptance criteria

- [ ] [unit] `parseStoredEvaluation`: `malformed` for `{"score": 5}`, `v1` for legacy row, `v2` for new row; never throws.
- [ ] [unit] `countsAsMistake` is false for every `standard` Correction.
- [ ] [unit] `EvaluatorOutputSchema` has no `.optional()` fields (nullable only).
- [ ] [integration] Migration applies cleanly; schema matches `backend-requirements.md` §2.2 for `corrections`.
- [ ] [check] `npm run check` green; `npm run pr:size` &lt; 500 production lines.

## Tests to write first

- `parseStoredEvaluation classifies v2, v1 and malformed rows`
- `standard corrections never count as mistakes`

## Out of scope

- Evaluate routes, AI prompt, fixtures, fake client scenarios (T21b).
- Review UI (T22).

## References

- Parent: `docs/plan/tickets/T21-evaluator-v2-corrections.md`
- `backend-requirements.md` §1, §1.1, §2.2
- WIP reference: local branch `ticket/t21-evaluator-v2` (uncommitted; take only contracts, migration, history-store, CONTEXT for this PR)
