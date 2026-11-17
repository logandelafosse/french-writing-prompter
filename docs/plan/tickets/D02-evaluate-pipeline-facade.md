# D02 — Evaluation pipeline behind `evaluate`

| Phase  | Type | Blocked by | Production lines (est.) |
| ------ | ---- | ---------- | ----------------------- |
| Deepen | AFK  | None       | ~250–400                |

## User stories

- As a maintainer, I want one `evaluate` call to return Evaluation + Corrections, so the evaluate route does not orchestrate post-process.
- As Logan, I want mark-up, DLF badges, Focus flags, and dialect-check questions unchanged.

## What to build

Fold `postProcessEvaluation` (and locate-quote as an internal Seam) into `WritingEvaluator.evaluate` (or a single exported function). `POST /api/sessions/[id]/evaluate` becomes remember → evaluate → persist → streak. See `docs/plan/deepenings.md`.

## Acceptance criteria

- [ ] `[unit]` empty quotes dropped, overlap filter, DLF attribution, Focus flags locked through `evaluate` (replace layered post-process-only tests)
- [ ] `[integration]` evaluate route no longer imports `postProcessEvaluation`
- [ ] `[check]` pr:size under 500

## Tests to write first

- `evaluate › returns corrections with spans for mixed kinds`
- `evaluate route › only persists module output`

## Out of scope

Prompt issuance (D01). Packaging dialect context object (D04) — may accept today’s note loading until D04.

## References

`docs/plan/deepenings.md`, `CONTEXT.md` › Evaluation, Correction, Span, DLF
