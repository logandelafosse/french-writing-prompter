# Delivery workflow

How the UI redesign (and later work) gets built by agents. The board is `docs/plan/board.md`; ticket specs live in `docs/plan/tickets/`.

## Roles

| Role | Model | Owns |
|---|---|---|
| Coordinator | Grok 4.7 high (`grok-4.7-high-fast`) | The board. Picks the next ticket, dispatches implementers and reviewers, records every status change and why. Never writes production code. |
| Implementer | Composer 2.5 when available; else Grok 4.6 (`cursor-grok-4.6-high-fast`) | One ticket on one branch. TDD, Playwright validation, PR. Prefer Composer 2.5; if the Task model allowlist has no Composer slug, use Grok 4.6 (medium preferred when offered; otherwise the listed high-fast slug). |
| Adversarial reviewer | Grok 4.7 high (`grok-4.7-high-fast`) | Spec adherence and bug hunting on the PR diff. (Opus paused — no utilization left.) |
| Test reviewer | Grok 4.7 high (`grok-4.7-high-fast`) | Test quality: duplication, terseness, usefulness, slop. |
| Tooling reviewer | Grok 4.7 high (`grok-4.7-high-fast`) | Where a lint rule, ast-grep rule, type, or script would have prevented a finding. |

The three reviewers run in parallel on the same PR and never see each other's output.

## Board rules

Columns: `Backlog`, `Ready`, `In progress`, `In review`, `Blocked`, `Done`.

Every card carries a one-line **why** for its current column, updated on every move:

- `Ready` — why it is unblocked (which blockers merged).
- `In progress` — who has it, branch name, started date.
- `In review` — PR link, which reviewers are running.
- `Blocked` — the exact blocker (ticket ID, owner decision, failing check) and what unblocks it.
- `Done` — PR link, merge date, and any follow-up tickets it spawned.

A ticket moves to `Ready` only when every ticket in its "Blocked by" list is `Done`. Tickets marked HITL stay in `Blocked` until Logan answers the open question recorded on the card.

**GitHub mirror.** Each ticket is a sub-issue of the parent spec issue #1 (issue number = ticket number + 2), with native "blocked by" links. `board.md` stays the source of truth for status and why. On every move the coordinator also comments the same why on the issue; the PR body says `Closes #<n>`; triage labels follow `docs/agents/triage-labels.md` (`needs-info` while an owner question is open, `ready-for-agent` once answered). If a ticket spec changes, edit the file in `docs/plan/tickets/`, then run `node scripts/sync-ticket-issues.mjs <ID> …` to rebuild the issue body from it (the Parent and Blocked-by header is kept).

The coordinator keeps at most three tickets `In progress` at once, and never two that touch the same module seam.

## Ticket loop

1. **Dispatch.** Coordinator moves the card to `In progress` and hands the implementer: the ticket file, `CONTEXT.md`, `docs/design/handoff/HANDOFF.md`, `docs/design/implementation-map.md`, `docs/plan/backend-requirements.md`, and this file.
2. **Red, green, refactor.** Implementer follows the `tdd` skill: one failing test per acceptance criterion before production code, then the smallest change that passes, then refactor with tests green. LLM calls are always faked (injected client or route interception); no test touches `data.db` or OpenAI.
3. **Size gate.** Production code diff (excluding tests, fixtures, docs, generated files, lockfiles), as measured by `npm run pr:size`, must stay under 500 lines. If it won't fit, the implementer stops and the coordinator splits the ticket. The only exception is a mechanical change with no behaviour change (for example the Prettier pass in T03): the coordinator may apply the `size-exempt` PR label, and records why on the card. `pr:size` counts `src/` only; for config- or rule-heavy tickets (ast-grep YAML, ESLint, CI, hooks) the adversarial reviewer estimates the non-test size against the same 500-line budget.
4. **Local gate.** `npm run check` (typecheck, lint, ast-grep, unit tests) passes.
5. **Playwright gate.** Every acceptance criterion that a learner can see has a Playwright spec that passes against `npm run dev` with OpenAI mocked. Screenshots for UI tickets go into the PR body (`pr-ui-evidence` skill). Desktop 1280 px and mobile 390 px for any screen work.
6. **PR.** One PR per ticket, linking the ticket file. Card moves to `In review`.
7. **Review.** Coordinator launches the three reviewers (below) in parallel.
8. **Fix loop.** Blocking findings go back to the same implementer. Re-run the gates, then re-run only the reviewers that raised blocking findings. Non-blocking findings become new Backlog tickets, linked on the card.
9. **Done.** All gates green and no blocking findings. Coordinator merges once the GitHub Actions **`check`** workflow is green on the PR (`lint`, `typecheck`, `test`, `build` via `npm run ci`). If the repo has no CI, add `.github/workflows/check.yml` before merging. Then move the card, record the PR and spawned follow-ups, and re-check which Backlog tickets became `Ready`.

## Reviewer briefs

**Adversarial reviewer.** Read the ticket, then the diff. Report: acceptance criteria not met or met only by coincidence; behaviour the spec forbids; bugs (state not cleared, race, unvalidated input, crash on malformed data, a11y misses called out in HANDOFF.md); copy that drifts from the handoff or the `CONTEXT.md` glossary. Each finding is `blocking` or `non-blocking` with file and line.

**Test reviewer.** Read only the tests and the ticket. Report: tests that duplicate each other; tests asserting implementation details instead of behaviour; tests that would pass if the feature were deleted; over-mocking; missing edge cases the acceptance criteria imply; verbose setup that a helper should own; Playwright specs that only check visibility. Recommend deletions as readily as additions. Keep the suite small and sharp.

**Tooling reviewer.** For every finding from the other two reviewers and every fix commit, ask whether a lint rule, ast-grep rule, stricter type, Zod schema, or script would have caught it. Output concrete rules (YAML or config snippet) and file them as tooling tickets in the Backlog.

## Definition of done

- [ ] Every acceptance criterion has a passing unit/integration test and, if learner-visible, a passing Playwright spec
- [ ] `npm run check` green; production diff under 500 lines
- [ ] Adversarial, test, and tooling reviews have no open blocking findings
- [ ] Domain terms match `CONTEXT.md`; UI copy matches the handoff
- [ ] Board card updated with PR link and spawned follow-ups
