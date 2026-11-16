# Board

Maintained by the coordinator (see `docs/agents/workflow.md`). Every card states **why** it is in its column; update the why on every move. Specs: `docs/plan/tickets/<ID>-*.md`. Open owner questions (Q1–Q8): `docs/plan/plan.md`.

GitHub mirror: parent spec [#1](https://github.com/logandelafosse/french-writing-prompter/issues/1); every ticket is a sub-issue numbered **ticket + 2** (T00 = #2, T35 = #37), with native "blocked by" links matching the tables below.

Last updated: 2026-11-15 by coordinator (T13e merged #57; T14 dispatch).

## Ready

| ID   | Ticket                                                                                           | Why                             |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------- |
| T13g | Wordmark 44px touch ([#59](https://github.com/logandelafosse/french-writing-prompter/issues/59)) | HANDOFF regression from PR #57. |

## In progress

| ID  | Ticket                                                                                                                 | Why                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| T14 | Home first run and `/api/today` bootstrap ([#16](https://github.com/logandelafosse/french-writing-prompter/issues/16)) | Branch `ticket/t14-home-today-bootstrap`; [implementer](bf7e6265-78a7-4a2e-87df-5e88cce24925). |

## In review

_None._

## Blocked

_None. HITL tickets below wait on owner questions as well as their blockers._

## Backlog

### Phase 0 — Foundations

| ID  | Ticket                                                              | Type | Blocked by | Why not ready            |
| --- | ------------------------------------------------------------------- | ---- | ---------- | ------------------------ |
| T03 | Prettier format-only pass                                           | AFK  | —          | **Done** — merged PR #40 |
| T05 | Zod contracts for API bodies, client fetches, env                   | AFK  | —          | **Done** — merged PR #42 |
| T06 | Single sources: dialect module, limits, local dates, knip, glossary | AFK  | —          | **Done** — merged PR #43 |
| T07 | ast-grep guardrails                                                 | AFK  | —          | **Done** — merged PR #44 |
| T08 | ESLint hardening and AGENTS.md engineering rules                    | AFK  | —          | **Done** — merged PR #46 |
| T09 | Design tokens, fonts, `lang="fr"`, metadata                         | AFK  | —          | **Done** — merged PR #45 |
| T10 | UI primitives                                                       | AFK  | —          | **Done** — merged PR #47 |
| T11 | Playwright tracer bullet with fake AI client and axe                | AFK  | —          | **Done** — merged PR #48 |
| T12 | Lefthook pre-commit                                                 | AFK  | —          | **Done** — merged PR #49 |
| T13 | App header, level menu, local-midnight quota                        | AFK  | —          | **Done** — PR #51 + #52  |

### Phase 1 — Core loop

| ID   | Ticket                                                              | Type | Blocked by | Why not ready                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------- | ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T13  | App header, level menu, local-midnight quota                        | AFK  | —          | **Done** — [PR #51](https://github.com/logandelafosse/french-writing-prompter/pull/51) + [PR #52](https://github.com/logandelafosse/french-writing-prompter/pull/52) 2026-11-15. |
| T13c | Header PR #52 review fixes                                          | AFK  | T13        | **Done** — merged [PR #54](https://github.com/logandelafosse/french-writing-prompter/pull/54) 2026-11-15.                                                                        |
| T13d | T13c e2e acceptance hardening                                       | AFK  | T13c       | **Backlog** — [#55](https://github.com/logandelafosse/french-writing-prompter/issues/55); PR #54 test gaps; does not block T14.                                                  |
| T13e | Mobile header rows + level card sync                                | AFK  | T13c       | **Done** — [PR #57](https://github.com/logandelafosse/french-writing-prompter/pull/57); mobile OK; **T13f** for stale level GET.                                                 |
| T13f | Level card vs stale GET /api/level                                  | AFK  | T13e       | **Backlog** — [#58](https://github.com/logandelafosse/french-writing-prompter/issues/58).                                                                                        |
| T13g | Wordmark 44px touch target                                          | AFK  | T13e       | **Ready** — [#59](https://github.com/logandelafosse/french-writing-prompter/issues/59); adversarial blocker PR #57.                                                                                                                           |
| T14  | Home first run and `/api/today` bootstrap                           | AFK  | —          | **In progress** — `ticket/t14-home-today-bootstrap`.                                                                                                                             |
| T15  | Generator v2 with structured prompt meta; prompt sheet              | AFK  | T14        | Needs Home phases. Q8: A1 10–20 / A2 80–120 / B1+ 250–300.                                                                                                                       |
| T16  | Writing surface: ruled textarea, word meter, shortcuts, busy labels | AFK  | T15        | Needs the prompt sheet                                                                                                                                                           |
| T17  | Session lifecycle and draft autosave                                | AFK  | T16        | Needs the writing surface. Not alongside T20 (both edit the evaluate route and `/api/today`).                                                                                    |
| T18  | Quota exhausted, swap confirm, session statuses                     | AFK  | T17        | Needs sessions with drafts. Q8: swap uses a daily slot. Not alongside T19 (both edit `POST /api/prompt` and Phase B).                                                            |
| T19  | Error and offline states                                            | AFK  | T17        | Needs local draft copy. Builds the shared `withErrors` route wrapper.                                                                                                            |
| T20  | Level service with durable streak and undoable advancement          | AFK  | T14        | Banner lives on the new Home. Not alongside T17 or T21.                                                                                                                          |
| T21  | Evaluator v2: Corrections, quote location, French output            | AFK  | T06, T17   | Needs dialect module and sessions. Q4 answered: taxonomy §1.1 as-is. ~480 lines: if over, split out the corrections table + stored-evaluation parser first.                      |
| T22  | Review screen: marked text, Mistake cards, Scores                   | AFK  | T16, T21   | Needs Corrections. Q5 answered: CECR chips + hover Pour monter. ~500 lines: split into T22a / T22b is pre-approved, see spec.                                                    |

### Phase 2 — Dialect

| ID  | Ticket                                           | Type | Blocked by | Why not ready                                                                                                                                                                      |
| --- | ------------------------------------------------ | ---- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T23 | Standard→Louisiana suggestions                   | AFK  | T22        | Needs the review screen                                                                                                                                                            |
| T24 | DLF lexicon, grader context, and attribution     | AFK  | T23        | Needs `standard` kind. Q6: versioned lexicon artifact from DLF-extract (definitions + examples).                                                                                   |
| T25 | Dialect checks, pushback, Add Dialect Note sheet | AFK  | T22        | Needs the review screen. Run after T23, not alongside it: both edit `CorrectionCard` and `MarkedText`. ~480 lines: split into T25a (server) / T25b (UI) is pre-approved, see spec. |
| T26 | Carnet page with Dialect Notes list              | AFK  | T25        | Needs notes to exist                                                                                                                                                               |
| T27 | Dialect Notes markdown export                    | AFK  | T26        | Needs note CRUD                                                                                                                                                                    |

### Phase 3 — Memory

| ID  | Ticket                                        | Type | Blocked by | Why not ready                                                                                                           |
| --- | --------------------------------------------- | ---- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| T28 | Weakness memory and Carnet "À travailler"     | AFK  | T22, T26   | Needs Mistakes and the Carnet page                                                                                      |
| T29 | Focus du jour driving prompts; "Pratiquer ça" | AFK  | T15, T28   | Needs Weaknesses and generator v2. ~420 lines: split into T29a (Focus) / T29b (Pratiquer ça) is pre-approved, see spec. |
| T30 | Resource catalog and links                    | AFK  | T28        | Needs Weakness categories. Q7: general French starter catalog; LA CI later.                                             |

### Phase 5 — Host (planned, not on board DAG yet)

| ID / draft | Ticket                 | Type | Blocked by | Why not ready                                                                                           |
| ---------- | ---------------------- | ---- | ---------- | ------------------------------------------------------------------------------------------------------- |
| T36–T39    | Vercel + Turso hosting | AFK  | Logan Qs   | Spec [`docs/plan/vercel-deployment.md`](vercel-deployment.md); coordinator files tickets after §7 HITL. |

### Phase 4 — Archive and polish

| ID  | Ticket                                   | Type | Blocked by         | Why not ready                                                                                            |
| --- | ---------------------------------------- | ---- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| T31 | History redesign                         | AFK  | T18, T22           | Needs statuses and Corrections. Rows use fallback titles until T29 stores Focus per session.             |
| T32 | Read-only past review                    | AFK  | T25, T31           | Needs all three Correction kinds and History. Adds the History link to this page.                        |
| T33 | Persistent Placement Test (server)       | AFK  | T20, T21           | Needs level service and Evaluator v2                                                                     |
| T34 | Placement Test screens                   | AFK  | T16, T33           | Needs writing surface and the placement API                                                              |
| T35 | Cleanup, motion, 390 px pass, a11y sweep | AFK  | T13–T34 UI tickets | Runs last. Split into T35a (mechanical) / T35b (motion, 390 px, a11y, README) is pre-approved, see spec. |

## Done

| ID   | Ticket                                                                                                                            | Why                                                                                                                                                                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T00  | Own repo and gitignore ([#2](https://github.com/logandelafosse/french-writing-prompter/issues/2))                                 | Done 2026-11-15 in the initial commit. Q1: private repo, `Personal-Projects` ignores the folder. All shell checks recorded on the issue.                                                                                                                                   |
| T01  | Isolated test DB and generated migrations ([#3](https://github.com/logandelafosse/french-writing-prompter/issues/3))              | Merged [PR #38](https://github.com/logandelafosse/french-writing-prompter/pull/38) 2026-11-15; CI `check` green. Follow-ups: Vitest guard hardening backlog, T07 ast-grep rules.                                                                                           |
| T02  | Baseline green: TS flags, `check`, `pr:size`, CI ([#4](https://github.com/logandelafosse/french-writing-prompter/issues/4))       | Merged [PR #39](https://github.com/logandelafosse/french-writing-prompter/pull/39) 2026-11-15. Adversarial blocking fix: root-level `fixtures/` in `pr:size`.                                                                                                              |
| T03  | Prettier format-only pass ([#5](https://github.com/logandelafosse/french-writing-prompter/issues/5))                              | Merged [PR #40](https://github.com/logandelafosse/french-writing-prompter/pull/40) 2026-11-15 merge commit; `size-exempt`.                                                                                                                                                 |
| T04  | Zod contracts for LLM output and stored JSON ([#6](https://github.com/logandelafosse/french-writing-prompter/issues/6))           | Merged [PR #41](https://github.com/logandelafosse/french-writing-prompter/pull/41) 2026-11-15; History evidence `docs/evidence/6/`.                                                                                                                                        |
| T05  | Zod contracts for API bodies, client fetches, env ([#7](https://github.com/logandelafosse/french-writing-prompter/issues/7))      | Merged [PR #42](https://github.com/logandelafosse/french-writing-prompter/pull/42) 2026-11-15; error-state evidence `docs/evidence/7/`; `pr:size` 494.                                                                                                                     |
| T06  | Single sources: dialect, limits, dates, knip, glossary ([#8](https://github.com/logandelafosse/french-writing-prompter/issues/8)) | Merged [PR #43](https://github.com/logandelafosse/french-writing-prompter/pull/43) 2026-11-15; History evidence `docs/evidence/8/`; knip in `check`.                                                                                                                       |
| T08  | ESLint hardening and AGENTS.md engineering rules ([#10](https://github.com/logandelafosse/french-writing-prompter/issues/10))     | Merged [PR #46](https://github.com/logandelafosse/french-writing-prompter/pull/46) 2026-11-15; `eslint-config.test.ts` + seam rules; T12 unblocked.                                                                                                                        |
| T09  | Design tokens, fonts, `lang="fr"`, metadata ([#11](https://github.com/logandelafosse/french-writing-prompter/issues/11))          | Merged [PR #45](https://github.com/logandelafosse/french-writing-prompter/pull/45) 2026-11-15; evidence `docs/evidence/11/`; T10 unblocked.                                                                                                                                |
| T10  | UI primitives ([#12](https://github.com/logandelafosse/french-writing-prompter/issues/12))                                        | Merged [PR #47](https://github.com/logandelafosse/french-writing-prompter/pull/47) 2026-11-15; no learner-visible UI; tooling follow-up: UI primitive ast-grep pack.                                                                                                       |
| T11  | Playwright tracer bullet with fake AI client and axe ([#13](https://github.com/logandelafosse/french-writing-prompter/issues/13)) | Merged [PR #48](https://github.com/logandelafosse/french-writing-prompter/pull/48) 2026-11-15; evidence `docs/evidence/T11/`; T13 unblocked.                                                                                                                               |
| T12  | Lefthook pre-commit ([#14](https://github.com/logandelafosse/french-writing-prompter/issues/14))                                  | Merged [PR #49](https://github.com/logandelafosse/french-writing-prompter/pull/49) 2026-11-15; hook integration tests + `opencode.json` guards.                                                                                                                            |
| T13  | App header, level menu, local-midnight quota ([#15](https://github.com/logandelafosse/french-writing-prompter/issues/15))         | Merged [PR #51](https://github.com/logandelafosse/french-writing-prompter/pull/51) + [PR #52](https://github.com/logandelafosse/french-writing-prompter/pull/52); follow-up [PR #54](https://github.com/logandelafosse/french-writing-prompter/pull/54) (T13c). T14 ready. |
| T13c | Header PR #52 review fixes ([#53](https://github.com/logandelafosse/french-writing-prompter/issues/53))                           | Merged [PR #54](https://github.com/logandelafosse/french-writing-prompter/pull/54) 2026-11-15; spawned T13d #55, T13e [PR #57](https://github.com/logandelafosse/french-writing-prompter/pull/57).                                                                         |
| T13e | Mobile header rows + level card sync ([#56](https://github.com/logandelafosse/french-writing-prompter/issues/56))                 | Merged [PR #57](https://github.com/logandelafosse/french-writing-prompter/pull/57); mobile OK; spawned **T13f** (stale level GET).                                                                                                                                         |
