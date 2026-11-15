# Plan: tutor redesign

Turn the CEFR grading demo into the Louisiana French writing tutor designed in `docs/design/handoff/`. The board is `docs/plan/board.md`, ticket specs are in `docs/plan/tickets/`, and the delivery loop is `docs/agents/workflow.md`.

## Inputs

| Doc | What it decides |
|---|---|
| `docs/design/handoff/HANDOFF.md` + `screens/` | The target UI: tokens, components, copy, states, a11y |
| `docs/design/implementation-map.md` | Screen → component → route/state mapping, copy table, 50 design gaps with assumed defaults |
| `docs/plan/backend-requirements.md` | Domain model, schema + migrations, API contracts, LLM prompts, DLF measurements |
| `docs/agents/tooling-review.md` | Compiler, ESLint, ast-grep, Zod, Playwright, and pre-commit setup |
| `CONTEXT.md` | Domain glossary (extended in T06 with the tutor vocabulary) |

## Product decisions already made

- Tutor feedback is in French. Louisiana French preferred; Standard French acceptable because models do Louisiana poorly.
- Standard French in Student Writing is never wrong. It gets a Standard→Louisiana suggestion that never counts as a Mistake.
- Three Correction kinds: Mistake (feeds Weakness memory), Standard→Louisiana (never counted), Dialect check (Yes → Dialect Note, No → Mistake).
- Spelling authority is the Dictionary of Louisiana French via `../DLF-extract/out/canonical.jsonl`, used as positive evidence only: a word missing from the DLF never makes something a Mistake.
- Resources come from a curated catalog of general French grammar and comprehensible-input sources, picked per Weakness category. The model chooses catalog IDs; it never invents URLs.
- Keep CEFR Level, Placement Test, and the 3-per-day quota (reset at local midnight).
- Dialect Notes: the database is the runtime source of truth; `docs/dialect/louisiana-french.md` is generated from it for coding agents and never read back.
- **Registre:** every Writing Prompt declares `formel` | `familier` | `mixt` in structured meta and in the prompt text. Logan practises both formal and informal styles; the Evaluation’s Register & Style dimension is judged against that declaration. Louisiana French is the dialect, not a permanent “always casual” mode.

## Phases

| Phase | Tickets | Outcome |
|---|---|---|
| 0. Foundations | T00–T12 | Own repo, safe test DB, migrations, Zod at every boundary, single sources, ast-grep + ESLint guardrails, design tokens and primitives, Playwright with a fake AI client |
| 1. Core loop | T13–T22 | Header with local-midnight quota, new Home (first run, writing, review), drafts, swap and error states, durable level tracking with undo, Evaluator v2 with Mistakes marked in text |
| 2. Dialect | T23–T27 | Standard→Louisiana suggestions with DLF attribution, Dialect checks, Add Dialect Note sheet, Carnet notes list, markdown export |
| 3. Memory | T28–T30 | Weaknesses with trend, Focus du jour driving prompts, Resources |
| 4. Archive and polish | T31–T35 | History redesign, read-only past reviews, persistent Placement Test, cleanup and motion |

The first ticket where it feels like a tutor is T22 (Mistakes marked in the text). Dialect awareness lands with T25, and memory with T29.

## Critical path

T00 → T01 → T02 → T04 → T05 → T06 → T09 → T10 → T11 → T13 → T14 → T15 → T16 → T17 → T21 → T22 → T25 → T26 → T28 → T29

Parallel lanes once their blockers are done: T03/T07/T08/T12 (tooling), T18–T20 (robustness and level service), T23/T24 (Standard + DLF), T27 (export), T30–T35.

## Owner decisions still open

Tickets that depend on one of these are HITL and stay `Blocked` until it is answered. Each has a default so work can proceed if Logan accepts it.

| ID | Question | Default if accepted | Blocks |
|---|---|---|---|
| Q1 | ~~Repo name, visibility, submodule or ignore~~ **Answered 2026-11-15:** private `logandelafosse/french-writing-prompter`; parent ignores the folder | — | T00 (done) |
| Q2 | ~~Louisiana base rules and CEFR level descriptions~~ **Answered 2026-11-15:** 12 rules, DLF spelling (`-autres`), DLF-sourced vocabulary, subjunctive accepted but never required; full list in the T06 spec | — | T06 |
| Q3 | ~~App name~~ **Answered 2026-11-15:** feature **Consigne** under product **Louisiana Languages**; tab title `Consigne · Louisiana Languages` | — | T13 |
| Q4 | ~~Mistake category taxonomy~~ **Answered 2026-11-15:** §1.1 as-is for v1 (15 + `autre`) | — | T21 |
| Q5 | ~~Score display~~ **Answered 2026-11-15:** CECR sub-levels per dimension + hover/tap “what it is / pour monter”; holistic tip inside Scores | — | T22 |
| Q6 | ~~DLF inheritance~~ **Answered 2026-11-15:** DLF-extract publishes a **lexicon artifact** (headwords, glosses, LA examples); Consigne pins a version and injects relevant entries into grader prompts. Not spellings-only; not submodule | — | T24 |
| Q7 | ~~Resource catalog~~ **Answered 2026-11-15:** general free French grammar + CI starter catalog; Logan edits in PR; LA-specific CI not required for v1 | — | T30 |
| Q8 | ~~Word target / swap / Placement memory~~ **Answered 2026-11-15:** A1 10–20, A2 80–120, B1–C2 250–300 (soft); swap uses a daily slot; Placement Mistakes feed Weakness memory | — | T15, T18, T28 |

## Models

Coordinator and all three reviewers: Opus 5.5. Implementer: Grok 4.6 fast (`cursor-grok-4.6-high-fast`), chosen by Logan; a different model family from the reviewers keeps the adversarial review independent.
