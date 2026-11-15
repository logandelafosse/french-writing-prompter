# Board

Maintained by the coordinator (see `docs/agents/workflow.md`). Every card states **why** it is in its column; update the why on every move. Specs: `docs/plan/tickets/<ID>-*.md`. Open owner questions (Q1–Q8): `docs/plan/plan.md`.

Last updated: 2026-11-14 by planning session.

## Ready

_None yet. T00 is waiting on Q1._

## In progress

_None._

## In review

_None._

## Blocked

| ID | Ticket | Why |
|---|---|---|
| T00 | Own repo and gitignore | Waiting on Q1 (repo name, visibility, how `Personal-Projects` treats the folder). Every other ticket needs a repo to open PRs against. |

## Backlog

### Phase 0 — Foundations

| ID | Ticket | Type | Blocked by | Why not ready |
|---|---|---|---|---|
| T01 | Isolated test DB and generated migrations | AFK | T00 | Needs the repo |
| T02 | Baseline green: TS flags, `check`, `pr:size`, CI | AFK | T01 | `check` runs tests, which must not touch `data.db` |
| T03 | Prettier format-only pass | AFK | T02 | Needs `check` to include `format:check` |
| T04 | Zod contracts for LLM output and stored JSON | AFK | T02 | Needs strict baseline |
| T05 | Zod contracts for API bodies, client fetches, env | AFK | T04 | Builds on the contracts module |
| T06 | Single sources: dialect module, limits, local dates, knip, glossary | HITL (Q2) | T04 | Needs contracts; owner approves rule wording |
| T07 | ast-grep guardrails | AFK | T06 | Rules reference the single-source modules |
| T08 | ESLint hardening and AGENTS.md engineering rules | AFK | T05, T07 | Needs boundaries typed so `no-unsafe-*` is quiet |
| T09 | Design tokens, fonts, `lang="fr"`, metadata | AFK | T02 | Needs `check`. Either order with T07: whichever merges second adds the scaffold-leftovers rule (see both specs). |
| T10 | UI primitives | AFK | T09 | Built on tokens. If T06's knip pass deleted `ui/button.tsx` or its deps, T10 recreates them. |
| T11 | Playwright tracer bullet with fake AI client and axe | AFK | T05 | Fake client is validated by the contracts. Its ast-grep seam rule is added only if T07 has merged. |
| T12 | Lefthook pre-commit | AFK | T08 | Hooks run the full lint set |

### Phase 1 — Core loop

| ID | Ticket | Type | Blocked by | Why not ready |
|---|---|---|---|---|
| T13 | App header, level menu, local-midnight quota | HITL (Q3) | T06, T10, T11 | Needs dates module, primitives, e2e; app name |
| T14 | Home first run and `/api/today` bootstrap | AFK | T13 | Needs the header |
| T15 | Generator v2 with structured prompt meta; prompt sheet | HITL (Q8) | T14 | Needs Home phases; word target at A1/A2 |
| T16 | Writing surface: ruled textarea, word meter, shortcuts, busy labels | AFK | T15 | Needs the prompt sheet |
| T17 | Session lifecycle and draft autosave | AFK | T16 | Needs the writing surface. Not alongside T20 (both edit the evaluate route and `/api/today`). |
| T18 | Quota exhausted, swap confirm, session statuses | HITL (Q8) | T17 | Needs sessions with drafts; swap cost. Not alongside T19 (both edit `POST /api/prompt` and Phase B). |
| T19 | Error and offline states | AFK | T17 | Needs local draft copy. Builds the shared `withErrors` route wrapper. |
| T20 | Level service with durable streak and undoable advancement | AFK | T14 | Banner lives on the new Home. Not alongside T17 or T21. |
| T21 | Evaluator v2: Corrections, quote location, French output | HITL (Q4) | T06, T17 | Needs dialect module and sessions; taxonomy. ~480 lines: if over, split out the corrections table + stored-evaluation parser first. |
| T22 | Review screen: marked text, Mistake cards, Scores | HITL (Q5) | T16, T21 | Needs Corrections; dimension display. ~500 lines: split into T22a / T22b is pre-approved, see spec. |

### Phase 2 — Dialect

| ID | Ticket | Type | Blocked by | Why not ready |
|---|---|---|---|---|
| T23 | Standard→Louisiana suggestions | AFK | T22 | Needs the review screen |
| T24 | DLF index and attribution | HITL (Q6) | T23 | Needs `standard` kind; licensing |
| T25 | Dialect checks, pushback, Add Dialect Note sheet | AFK | T22 | Needs the review screen. Run after T23, not alongside it: both edit `CorrectionCard` and `MarkedText`. ~480 lines: split into T25a (server) / T25b (UI) is pre-approved, see spec. |
| T26 | Carnet page with Dialect Notes list | AFK | T25 | Needs notes to exist |
| T27 | Dialect Notes markdown export | AFK | T26 | Needs note CRUD |

### Phase 3 — Memory

| ID | Ticket | Type | Blocked by | Why not ready |
|---|---|---|---|---|
| T28 | Weakness memory and Carnet "À travailler" | AFK | T22, T26 | Needs Mistakes and the Carnet page |
| T29 | Focus du jour driving prompts; "Pratiquer ça" | AFK | T15, T28 | Needs Weaknesses and generator v2. ~420 lines: split into T29a (Focus) / T29b (Pratiquer ça) is pre-approved, see spec. |
| T30 | Resource catalog and links | HITL (Q7) | T28 | Needs Weakness categories; catalog contents |

### Phase 4 — Archive and polish

| ID | Ticket | Type | Blocked by | Why not ready |
|---|---|---|---|---|
| T31 | History redesign | AFK | T18, T22 | Needs statuses and Corrections. Rows use fallback titles until T29 stores Focus per session. |
| T32 | Read-only past review | AFK | T25, T31 | Needs all three Correction kinds and History. Adds the History link to this page. |
| T33 | Persistent Placement Test (server) | AFK | T20, T21 | Needs level service and Evaluator v2 |
| T34 | Placement Test screens | AFK | T16, T33 | Needs writing surface and the placement API |
| T35 | Cleanup, motion, 390 px pass, a11y sweep | AFK | T13–T34 UI tickets | Runs last. Split into T35a (mechanical) / T35b (motion, 390 px, a11y, README) is pre-approved, see spec. |

## Done

_None._
