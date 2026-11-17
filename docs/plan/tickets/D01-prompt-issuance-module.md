# D01 — Prompt issuance module

| Phase  | Type | Blocked by    | Production lines (est.) |
| ------ | ---- | ------------- | ----------------------- |
| Deepen | AFK  | D03 preferred | ~350–450                |

## User stories

- As a maintainer, I want daily prompt issuance behind one module Seam, so that `POST /api/prompt` only parses and responds.
- As Logan, I want abandon, quota, Focus, and Practice Pin behaviour unchanged.

## What to build

`issueDailyPrompt` (name flexible) owning: quota lock/assert, draft-abandon confirm, Focus snapshot + pin consume, `PromptGenerator`, transactional abandon of actives + insert daily Session. Route drops `@/db` / drizzle. See `docs/plan/deepenings.md`.

## Acceptance criteria

- [ ] `[unit]` quota exhausted, abandon confirm, pin consume, Focus constraints covered through the module
- [ ] `[integration]` `src/app/api/prompt/route.ts` has no `@/db` import; handler stays thin parse → module → respond
- [ ] `[check]` `knip` clean; pr:size under 500

## Tests to write first

- `issueDailyPrompt › refuses when quota exhausted`
- `issueDailyPrompt › abandons active draft only when confirmed`
- `prompt route › does not import db`

## Out of scope

Post-process / evaluate (D02). Learner-dialect context packaging (D04). Session façade for Home (D05).

## References

`docs/plan/deepenings.md`, `CONTEXT.md` › Module homes (Writing Prompt, Daily Quota, Focus du jour, Practice Pin)
