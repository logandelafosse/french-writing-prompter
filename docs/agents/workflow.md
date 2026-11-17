# Delivery workflow

How the UI redesign (and later work) gets built by agents. The board is `docs/plan/board.md`; ticket specs live in `docs/plan/tickets/`.

## Roles

| Role                 | Model                                                     | Owns                                                                                                                                                       |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coordinator          | Grok 4.7 high (`grok-4.7-high-fast`)                      | The board. Picks the next ticket, dispatches implementers and reviewers, records every status change and why. Never writes production code.                |
| Implementer          | Router default, or Grok 4.6 (`cursor-grok-4.6-high-fast`) | One ticket on one branch. TDD, Playwright validation, PR. Do not pin Composer 2.5 — leave model unset for router auto-decide, or pass Grok 4.6 explicitly. |
| Adversarial reviewer | Grok 4.7 high (`grok-4.7-high-fast`)                      | Spec adherence and bug hunting on the PR diff. (Opus paused — no utilization left.)                                                                        |
| Test reviewer        | Grok 4.7 high (`grok-4.7-high-fast`)                      | Test quality: duplication, terseness, usefulness, slop.                                                                                                    |
| Tooling reviewer     | Grok 4.7 high (`grok-4.7-high-fast`)                      | Where a lint rule, ast-grep rule, type, or script would have prevented a finding.                                                                          |

The three reviewers run in parallel on the same PR and never see each other's output.

## Review scope (diff only — all three reviewers)

Reviews are **not** a whole-repo audit. Each reviewer works from the **PR diff against merge-base** only (`git diff <base>...HEAD`, same base `npm run pr:size` uses). The coordinator passes in the brief: ticket spec path, merge-base SHA (usually `github/main`), and PR number.

| Reviewer    | Read                                                                                                                                                                   | Do not read (unless one cited hunk needs a sibling line)                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Adversarial | Ticket + **production hunks** in the diff (`src/`, excluding `*.test.*`, `*.spec.*`) + HANDOFF **sections for screens touched** in the diff + PR “What a learner sees” | Full `HANDOFF.md`, `implementation-map.md`, `CONTEXT.md`, or files with no hunks |
| Test        | Ticket acceptance criteria + **test hunks** in the diff (`**/*.test.*`, `e2e/**`, fixtures only if referenced by changed tests)                                        | Production sources except the few lines a test import requires                   |
| Tooling     | Ticket + **production and config hunks** in the diff (`src/`, `tooling/`, `eslint.config.*`, `sgconfig.yml`, `lefthook.yml`, workflows)                                | Entire rule catalogs, `knip` full graph, or modules unchanged in the PR          |

**Efficiency rules**

- Findings must cite **changed** lines (file:line in the diff). Do not open issues in untouched files.
- **Re-review after a fix** uses `git diff <fix-parent>..HEAD` only (typically one commit), not the full PR again.
- If the diff is empty in a reviewer’s lane (e.g. docs-only PR), that reviewer posts “no scope” and stops.
- Parallel reviewers do **not** wait on each other. Tooling still runs on every PR: it asks what **new** pattern in this diff should become lint, ast-grep, Zod, or script — not whether it would have caught another reviewer’s chat-only finding.

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
6. **PR.** One PR per ticket, linking the ticket file (`.github/pull_request_template.md`). **What a learner sees** is mandatory: embed screenshots and/or a short video per the **pr-ui-evidence** skill (`~/.cursor/skills/pr-ui-evidence/SKILL.md`) when anything learner-visible changes; otherwise write “no learner-visible UI change” and why. Evidence lives in `docs/evidence/<issue-number>/` on the PR branch; link with **GitHub blob URLs** on the PR branch (`docs/evidence/README.md`) — not `raw.githubusercontent.com` or mobile-broken relative image embeds. Card moves to `In review`.
7. **Review.** Coordinator launches the three reviewers (below) in parallel, each with the **diff-scoped brief** (merge-base, ticket, PR link). See **Review scope**.
8. **Fix loop.** Blocking findings go back to the same implementer (**resume** the implementer agent when possible). Post the blocking list as a **GitHub PR comment** before the fix dispatch. Re-run the gates, then re-run only the reviewers that raised blocking findings, on the **fix commit diff** only. Non-blocking findings become new Backlog tickets, linked on the card.
9. **Done.** All gates green and no blocking findings. Coordinator merges once the GitHub Actions **`check`** workflow is green on the PR (`lint`, `typecheck`, `test`, `build` via `npm run ci`). If the repo has no CI, add `.github/workflows/check.yml` before merging. UI PRs also need embedded evidence in **What a learner sees** (or an explicit no-UI note). Then move the card, record the PR and spawned follow-ups, and re-check which Backlog tickets became `Ready`.

## Reviewer briefs

Use **Review scope**; findings only on changed lines.

**Adversarial reviewer.** Read the ticket, then **production hunks** in `git diff <base>...HEAD`. Report: acceptance criteria not met or met only by coincidence; behaviour the spec forbids; bugs (state not cleared, race, unvalidated input, crash on malformed data, a11y misses in HANDOFF for the touched UI); copy that drifts from the handoff or `CONTEXT.md` glossary on changed strings. For learner-visible work: **blocking** if **What a learner sees** has no embedded media and no honest no-UI statement. Each finding is `blocking` or `non-blocking` with file and line in the diff.

**Test reviewer.** Read the ticket’s test-related acceptance criteria, then **only test/e2e hunks** in the diff. Report: duplication, implementation-detail asserts, tests that pass if the feature were deleted, over-mocking, missing AC edges, verbose setup, Playwright that only checks visibility. Recommend deletions as readily as additions. Do not re-review the full suite under `src/`.

**Tooling reviewer.** Read the ticket and **production + tooling config hunks** in the diff. For patterns introduced or touched in this PR, ask whether an existing rule should have caught them; if not, propose a **concrete** lint rule, ast-grep rule, stricter type, Zod boundary, or script (snippet + target path). File proposals as TOOL-PR\* or Backlog rows. Stay on the diff: do not propose repo-wide rule sweeps. After a fix commit, a short tooling pass on `git diff HEAD~1..HEAD` is enough.

## Session efficiency retro (every five merges)

Every **five tickets merged to `main`**, the coordinator runs a **session efficiency reviewer** (same model family as adversarial: Grok 4.7 high). It does not re-review product code; it reviews **how agents worked**: duplicated context, wrong worktree, CI/docs toil, review-token waste, and fix-commit patterns.

Output: append to `docs/agents/session-retro.md` (dated section + **TOOL-SESSION-N** backlog). Mirror P0–P1 session items into `docs/agents/tooling-review.md`. Update the retro footer: **next retro after ticket X**.

**Counter:** last retro after **T32** (2026-11-16). **Next:** after **T37** merges (or when Logan asks).

Coordinator habits from the first retro (see `session-retro.md`):

- Read the board only from `origin/main` (`git show origin/main:docs/plan/board.md`).
- Dispatch implementers from a **fresh worktree** off `main`, not from a dirty primary checkout.
- Prefer **docs-only** board pushes with CI/lefthook that skip full gates when the diff is only `docs/**` (once TOOL-SESSION-2/5 land).
- Do not use `LEFTHOOK=0` except emergencies; never for mixed `src/` commits.
- Post **blocking** review summaries as a **GitHub PR comment** so fix commits are traceable without the chat transcript.

## Definition of done

- [ ] Every acceptance criterion has a passing unit/integration test and, if learner-visible, a passing Playwright spec
- [ ] `npm run check` green; production diff under 500 lines
- [ ] PR **What a learner sees** has embedded screenshots/video or explicit “no UI change”
- [ ] Adversarial, test, and tooling reviews have no open blocking findings
- [ ] Domain terms match `CONTEXT.md`; UI copy matches the handoff
- [ ] Board card updated with PR link and spawned follow-ups
