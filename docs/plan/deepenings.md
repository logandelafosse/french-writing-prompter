# Module deepenings (post–T35)

After the Consigne UI redesign (T00–T35), routes and pages still **assemble** several deep pieces by hand. This plan hides that complexity behind small Interfaces (deep modules) so entry points stay parse → module → respond.

Vocabulary: domain terms in [`CONTEXT.md`](../../CONTEXT.md) (including **Module homes**). Design words (**Module**, **Interface**, **Implementation**, **Depth**, **Seam**, **Adapter**, **Leverage**, **Locality**) live in [`AGENTS.md`](../../AGENTS.md) › Module seams.

Board: add D01–D05 under Ready when Logan wants this lane; hosting (T36–T39) can stay parallel.

## Principles

- One ticket ≈ one Seam. `npm run pr:size` under 500 production lines.
- TDD at the outermost Seam that will own the behaviour (new module function or thinned route).
- Delete the orchestration you replace (route/page shrinks in the same PR).
- Prefer façades over new hypothetical ports unless a second Adapter already exists (`createTestDb` / `OpenAiClientLike` are enough).
- Do not re-open Placement durability (T33/T34 done). Only shrink `PlacementService` if callers still see store guts.

## Dependency graph

```
D01 Prompt issuance ─────────────────────────────┐
D02 Evaluate = evaluate + post-process ──────────┤ independent of each other
D03 Weakness / Focus façade ─── helps D01 ───────┤
D04 Learner-dialect context ─── helps D02 ───────┤
D05 Session / Draft façade ──── helps Home/Carnet ┘
```

Suggested order: **D02 → D03 → D01 → D04 → D05** (D02 and D03 can parallel; D01 after D03 so Focus is one call; D04 after D02; D05 last — largest UI touch).

## D01 — Prompt issuance module

|            |                                                                            |
| ---------- | -------------------------------------------------------------------------- |
| Est.       | ~350–450 prod lines                                                        |
| Blocked by | D03 preferred (Focus façade); else temporary wire                          |
| Closes     | Fat `POST /api/prompt` (`@/db`, txn, quota lock, abandon, Focus, generate) |

**Interface (target):** `issueDailyPrompt(input, deps) → session | typed failure`  
Hides: quota assert + process lock, draft-abandon confirm, Focus snapshot / Practice Pin consume, `PromptGenerator`, `BEGIN IMMEDIATE` abandon+insert.

**Entry point after:** route parses body → `issueDailyPrompt` → map errors → JSON.

**AC sketch:** `[unit]` abandon/quota/pin/Focus invariants through the module; `[integration]` route under ~40 lines, no `@/db` import in the route file.

## D02 — Evaluation pipeline behind `evaluate`

|            |                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Est.       | ~250–400                                                                                               |
| Blocked by | None                                                                                                   |
| Closes     | Fat `POST /api/sessions/[id]/evaluate` wiring `WritingEvaluator.evaluate` then `postProcessEvaluation` |

**Interface (target):** `evaluate(writing, prompt, dialectContext, opts) → { evaluation, corrections }`  
Fold locate-quote, overlap filter, DLF badges, resources, Focus flags, dialect-check question defaults **inside** the call. `locate-quote` becomes an internal Seam.

**Entry point after:** remember writing → `evaluate` → persist session/corrections/level streak.

**AC sketch:** `[unit]` post-process behaviours locked through `evaluate` (replace layered tests, don’t stack); route loses post-process imports.

## D03 — Weakness / Focus façade

|            |                                                                            |
| ---------- | -------------------------------------------------------------------------- |
| Est.       | ~200–350                                                                   |
| Blocked by | None                                                                       |
| Closes     | Triple assembly in prompt route, `GET /api/weaknesses`, `src/server/today` |

**Interface (target):** e.g. `weaknessBoard()` / `currentFocus()` → ranked Weaknesses, pending Practice Pin, live Focus ids.  
Keep `aggregateWeaknesses` / `computeTrend` as internals (or test-internal). Presentation (`toFocusItems`, `elicitFocus`) stays on the way out.

**AC sketch:** `[unit]` one module call matches today’s composed behaviour; three callers delete their hand-rolled lists.

## D04 — Learner-dialect context

|            |                                                                              |
| ---------- | ---------------------------------------------------------------------------- |
| Est.       | ~200–350                                                                     |
| Blocked by | D02 preferred                                                                |
| Closes     | Gen / eval / post-process each importing different `dialect/*` + notes + DLF |

**Interface (target):** `LearnerDialectContext` (rules + active Dialect Notes + DLF index handle) built once per request; passed into generator and evaluator.

**AC sketch:** `[unit]` “never flag confirmed Louisiana” fails in one place if context omits notes; generator/evaluator no longer each call `listActiveNotes` + render helpers ad hoc.

## D05 — Session / Draft façade

|            |                                                                                |
| ---------- | ------------------------------------------------------------------------------ |
| Est.       | ~300–450                                                                       |
| Blocked by | None (can follow D01 so Home only talks HTTP + thin client helpers)            |
| Closes     | `HomePage` / Carnet inventing Session lifecycle on top of `history-store` CRUD |

**Interface (target):** open / save Draft / list / load for review — small verb set. `history-store` remains the persistence Adapter.

**AC sketch:** `[unit]` façade owns draft+status rules; Home shrinks orchestration (may split ticket if UI > 500 lines).

## Out of scope (do not ticket here)

- Vercel/Turso hosting (T36–T39 / `vercel-deployment.md`)
- Replacing Placement persistence
- TOOL-SESSION / TOOL-PR backlog (separate tooling PRs)
- Deduping `OpenAiClientLike` — do inside D01/D02 when touching those files
- Sealing `quotaTimeZone` — do inside D01 when moving quota behind issuance

## Definition of done (lane)

- [ ] Each Di merged with reviews + green CI
- [ ] `CONTEXT.md` Module homes table still accurate
- [ ] No new fat route that imports `@/db` outside store/façade modules
- [ ] Board Ready empty or only hosting HITL
