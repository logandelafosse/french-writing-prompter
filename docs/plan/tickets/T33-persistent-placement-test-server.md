# T33 — Persistent Placement Test (server)

GitHub issue: #35

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 4     | AFK  | T20, T21   | ~380                    |

## User stories

- As Logan, I want my Placement Test progress and drafts kept on the server, so that closing the tab or restarting the app resumes me at the same step with my text intact.
- As Logan, I want the Placement Test to set my CEFR Level through the same level service as everything else, without using my three daily consignes, so that the level history stays truthful and I can still write today.

## What to build

The module-level `let placementTest` in `src/app/api/placement/route.ts` is replaced by DB state, which fixes defects D6 and D7.

**Schema.** A migration adds the `placement_runs` table (`status` `in_progress | complete | abandoned`, `step`, `final_level`, `started_at`, `completed_at`). It also adds `placement_run_id` and `placement_step` on `sessions` if earlier tickets have not.

**Sessions.** Each step's Writing Prompt is a `kind = 'placement'` session. Steps reuse the draft autosave endpoint from T17 and the Evaluator v2 pipeline from T21, so placement Corrections are stored like any other. Placement sessions never count toward the daily quota and never feed the level streak.

**Step logic.** The `PlacementTest` class becomes pure functions driven by DB rows:

- `stepLevel(step)` keeps today's fixed A2 → B1 → B2 sequence.
- `computeLevel(levels)` keeps the median.
- `buildResults(run, sessions)` builds the result data.

A `placement-service` orchestrates the steps. The routes follow `backend-requirements.md` §3 › Placement Test:

- `GET /api/placement` returns the current run (`in_progress`, or the latest `complete` one) with the current step's `SessionDetail`, including its draft, so the client can resume.
- `POST /api/placement/start` creates the run and the step 1 session. It returns `409 CONFLICT` when a level is already set. When a run is already in progress, it returns that run instead of creating a second.
- `POST /api/placement/:runId/submit { sessionId, text }` works like the evaluate route. It saves the text before calling the LLM, evaluates, and then generates the next step's prompt. If evaluation succeeded but the next prompt failed, resubmitting the same session skips evaluation and retries only the generation. The run's `step` advances only once the next session exists.
- After step 3, the service calls `levelService.setLevel(finalLevel, "placement")` (T20), marks the run `complete` and returns the results.

**Results data** (`PlacementResultView`):

- `finalLevel`, plus `levelName`, the French CEFR label (e.g. `Seuil`).
- `summary`: the final step's `nextLevelTip`. This is an assumption; it avoids an extra LLM call.
- `steps[]`, each with `{ step, promptLevel, evaluatedLevel, summary, mistakeCount }`. `summary` is that step's Evaluation `summary`, in French.

Setting a level manually (`PUT /api/level`) while a run is `in_progress` marks that run `abandoned`.

All bodies go through Zod request schemas, and all errors use the standard error envelope.

## Acceptance criteria

- [ ] `[unit]` `stepLevel` returns A2, B1, B2 for steps 1–3. `computeLevel(["A2","B2","B1"])` is `B1`.
- [ ] `[unit]` `buildResults` maps three evaluated sessions to `steps[]` in step order. `mistakeCount` uses `countsAsMistake`.
- [ ] `[integration]` start → submit ×3 with the fake LLM client leaves three `kind = 'placement'` sessions with stored Corrections, a `complete` run, and a `level_changes` row with source `placement`.
- [ ] `[integration]` After a full run, the daily quota still reports `remaining: 3`.
- [ ] `[integration]` Resume after restart: start, save a draft on step 1, submit step 1, save a draft on step 2. Then build a fresh service instance over the same DB. `GET /api/placement` returns step 2 with that draft text.
- [ ] `[integration]` `POST /api/placement/start` returns 409 when a level exists, and returns the existing run (no new row) when one is in progress.
- [ ] `[integration]` Submitting with the wrong `sessionId` or step returns `409 CONFLICT`. An empty `text` returns `422 VALIDATION`.
- [ ] `[integration]` When the fake client fails evaluation, the response is `502 AI_UNAVAILABLE`, the session's `writing_text` is saved, and the run stays on the same step.
- [ ] `[integration]` When evaluation succeeds but next-prompt generation fails, resubmitting the same session evaluates nothing new (the fake client sees zero evaluator calls) and advances the step once generation succeeds.
- [ ] `[integration]` Placement sessions do not count toward the auto-advancement streak in the level service.
- [ ] `[integration]` `PUT /api/level` during an `in_progress` run marks it `abandoned`. `GET /api/placement` then returns `{ run: null }`.
- [ ] `[check]` No module-level mutable state remains in `src/app/api/placement/`. The `action: "start" | "submit"` POST body is removed.

## Tests to write first

- `placement logic › fixed step levels and median result`
- `placement service › full run sets level via level service with source placement`
- `placement service › does not consume daily quota`
- `placement service › resumes current step and draft from a fresh instance`
- `placement service › evaluation failure keeps text and step`
- `placement service › retry after generation failure does not re-evaluate`
- `placement routes › start conflicts when a level is set`

## Out of scope

- The `/placement` screens and first-run gating in the UI: T34.
- Whether placement Mistakes count toward Weaknesses and Focus (Q8): the aggregation in T28 owns that filter. This ticket stores the Corrections either way, on sessions with `kind = 'placement'`.
- Adaptive step levels based on the previous result: not planned. The fixed sequence is kept.
- Placement sessions in History: excluded by T31.

## References

- `implementation-map.md` §3.2 (PlacementPhase), §4.11 (PlacementState, PlacementResultView), §6 gaps #10, #32, #46
- `backend-requirements.md` §1 (`SessionKind`, `countsAsMistake`), §2.2 (`placement_runs`, session columns), §3 › Placement Test and conventions, §5 D5–D7, §7 S13
- `CONTEXT.md` › Placement Test
