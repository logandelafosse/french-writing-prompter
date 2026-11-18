# Session efficiency retros

Periodic review of coordinator and implementer sessions for **toil**, **mistakes**, and **token efficiency**. Not a substitute for per-PR adversarial/test/tooling reviews.

## Cadence

The **coordinator** runs a **session efficiency reviewer** (Grok 4.7 high) **every five tickets merged to `main`** (count parent tickets and split slices like T25a/T25b as one parent each unless both merged in the same retro window — default: **one board `Done` row per counted ticket**).

On each retro:

1. Scope the last five merges (PR links, SHAs, fix commits).
2. Append a dated section below (do not delete prior retros).
3. File actionable items as **TOOL-SESSION-N** in the retro’s backlog table and mirror P0–P1 rows into `docs/agents/tooling-review.md` under a `### Session retro` heading.
4. Per-PR **tooling reviewers** skim this backlog and prefer **deterministic scripts** that close open TOOL-SESSION rows when the PR’s pattern makes them relevant (see `workflow.md` Tooling reviewer brief).
5. Update `docs/agents/workflow.md` counter: **Next retro after ticket &lt;ID&gt; merges.**

**Last retro:** T37 merged (PR #104; hosting arc T36–T39, 2026-11-18). **Next retro after:** five further merges to `main`, or when Logan asks. T40 is HITL and is not an AFK ticket, so it does not count toward those five.

## Retro — T23–T27 (2026-11-16)

Scope: PRs [#75](https://github.com/logandelafosse/french-writing-prompter/pull/75)–[#80](https://github.com/logandelafosse/french-writing-prompter/pull/80) (T23–T27).

### Toil inventory

| Toil                                                                                       | Impact                                          |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Dirty primary checkout → extra worktrees (`t22b`, `t26`), duplicate `npm ci`               | Re-read HANDOFF/ticket; wrong branch context    |
| Stale `board.md` on disk vs `origin/main`                                                  | Wrong dispatch / duplicate coordinator work     |
| `getByLabel("Ton texte")` substring clash with review `aria-label="Consigne et ton texte"` | **8+ red `main` e2e runs** on unrelated pushes  |
| `npm run dev` without `source .env`                                                        | `predev` migrate fails on `OPENAI_API_KEY`      |
| Three full PR reviews × six PRs + fix subagents                                            | Large diffs re-read (T24 ~1.4k lines in review) |
| `push` to `main` runs full CI including board-only commits                                 | ~10 min per board commit                        |
| `lefthook-hooks.test.ts` fetches opencode schema over network                              | Flaky `check`, e2e skipped                      |
| `LEFTHOOK=0` on coordinator pushes                                                         | Local gate skipped; GitHub still red on flake   |
| `pr:size` cliff at 499–500                                                                 | T25b/T26 end trimmed to fit                     |

### Mistakes / near-misses

- **Coordinator:** dispatched from stale board; `LEFTHOOK=0` normalized; full review trio on tiny T23; tooling “before T25/T26” not scheduled; findings only in chat (GitHub `reviews: []`).
- **Implementer:** DLF badge via `dlf_headword` fallback (fixed `4a589f0`); dialect-note race outside transaction (`334ac23`); export dates without explicit zone (`48751ca`); shared e2e label helper still substring-based after `a55d444`.

### Recommendations (prioritized)

1. **P0** — `writingField()` = `getByRole("textbox", { name: "Ton texte", exact: true })` + ast-grep ban on substring `getByLabel` in `e2e/`.
2. **P0** — Skip `e2e` on `push` to `main` when diff is only `docs/**`.
3. **P0** — Vendor or mock opencode schema in `lefthook-hooks.test.ts` (no network in `check`).
4. **P0** — `predev` loads `.env`; migrate path must not require OpenAI key for `file:./data.db`.
5. **P1** — Lefthook `pre-push` skip when push is docs-only; end `LEFTHOOK=0` for board.
6. **P1** — `scripts/ticket-worktree` + board read via `git show origin/main:docs/plan/board.md`.
7. **P1** — `pr:size` top files + split before dispatch if estimate ≥400 or first green ≥450.
8. **P1** — Diff-scoped reviews (all three reviewers; see `workflow.md` **Review scope**); post blocking list as PR comment; re-review only the reviewer that blocked, on the fix commit diff only.

### TOOL-SESSION backlog (T23–T27 arc)

| ID             | Pri | Change                                                              |
| -------------- | --- | ------------------------------------------------------------------- |
| TOOL-SESSION-1 | P0  | `writingField` + ast-grep ban substring label in e2e                |
| TOOL-SESSION-2 | P0  | CI: docs-only `main` push skips e2e                                 |
| TOOL-SESSION-3 | P0  | Offline opencode schema test                                        |
| TOOL-SESSION-4 | P0  | dev/migrate env loading without OpenAI for local DB                 |
| TOOL-SESSION-5 | P1  | Lefthook docs-only pre-push skip                                    |
| TOOL-SESSION-6 | P1  | `ticket-worktree` + board from `origin/main`                        |
| TOOL-SESSION-7 | P1  | `pr:size` file list + split thresholds                              |
| TOOL-SESSION-8 | P1  | Diff-scoped review briefs + PR comment trail (keep all 3 reviewers) |
| TOOL-SESSION-9 | P2  | Export TZ contract test (UTC vs Chicago)                            |

Reviewer: [385b4c0e-3ca1-4957-bb34-7657f9afa5b3](385b4c0e-3ca1-4957-bb34-7657f9afa5b3).

## Retro — T36–T39 (2026-11-18)

Scheduled by the counter set after T32. Scope is the hosting session only.

Merge order:

| Ticket | PR                                                                                       | SHA       |
| ------ | ---------------------------------------------------------------------------------------- | --------- |
| T36    | [#103](https://github.com/logandelafosse/french-writing-prompter/pull/103)               | `347ac32` |
| T38    | [#102](https://github.com/logandelafosse/french-writing-prompter/pull/102)               | `d114b40` |
| T39    | [#101](https://github.com/logandelafosse/french-writing-prompter/pull/101) fix `a4cb4b4` | `29a4198` |
| T37    | [#104](https://github.com/logandelafosse/french-writing-prompter/pull/104)               | `cbc0d8a` |

T33–T35 and D01–D05 are outside this hosting arc and are not inventoried here.

### Toil inventory

| Toil                                                                                         | Impact                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run pr:size` merge-base is the name `origin/main`                                       | Worktrees reported thousands of production lines. `git merge-base origin/main` is ambiguous and selects `refs/heads/origin/main` (2026-11-16, 103 commits behind `github/main` at `cbc0d8a`). Remote `origin` is a local bare repo, so `refs/remotes/origin/main` is stale too. Real totals against `github/main`: T36 57, T38 15, T39 0 then 18, T37 61. GitHub CI measured the real base. |
| `scripts/sync-ticket-issues.mjs` sets the issue to ticket number + 2                         | Running it for T38 wrote the T38 spec onto PR #40 (the merged T03 PR). The body was restored the same day. Hosting issues are #96–#99.                                                                                                                                                                                                                                                      |
| Every docs-only board push ran lefthook `pre-push` → `npm run check` (~60s), then GitHub e2e | TOOL-SESSION-2 and TOOL-SESSION-5 are still open. The mechanism is unchanged. This arc paid that full gate on each board push (`ec699f7`, `4411adc`, `73cefad`, `ff9820d`, `c92f3af`, `201bbc7`).                                                                                                                                                                                           |
| Task tool rejected implementer slug `cursor-grok-4.6-high-fast`                              | The only explicit slug the tool accepted was `composer-2.5-fast`. Implementers ran with the model omitted (parent Grok 4.7).                                                                                                                                                                                                                                                                |

### What worked

- Fresh worktrees off `github/main`. The dirty primary checkout stayed untouched.
- T36 (#103) and T38 (#102) merged with no blocking review findings.
- T37 (#104) adversarial review was clear. `check` and `e2e` were the merge gate and were green.
- T39 re-review was the fix commit `a4cb4b4` only.
- Implementers ran with the model omitted. Composer was not used.

### Mistakes / near-misses

- **Size gate.** `tooling/pr-size/run-pr-size.ts` defaults `baseRef` to `"origin/main"` and prints only the merge-base SHA, so the stale branch was invisible in the total.
- **Issue sync.** Hosting issues are #96–#99. The script must not be used for those ids until the map is fixed.
- **T39, fixed in the same PR.** `.github/workflows/check.yml` already had `LEFTHOOK: "0"`. `package.json` `prepare` called `lefthook install`, and that binary ignores `LEFTHOOK=0` (only `node_modules/lefthook/postinstall.js` honors it). `a4cb4b4` added `scripts/install-hooks.mjs`, which exits before spawning lefthook when `CI` is set or `LEFTHOOK` is `0` or `false`.
- **T37 review notes, left non-blocking.** Test and tooling reviewers wanted stronger locks: spawn the wrapper, and forbid a future `prebuild` that calls migrate. The coordinator left them non-blocking because `runVercelBuild` tests already refuse `file:` and pass the URL to the injected migrator, and `npm run build` is still `next build`. Follow-ups are TOOL-SESSION-12 and TOOL-SESSION-13.
- **Vercel preview for #104 failed.** Expected until T40 sets a libsql URL and token. Leave `vercel deploy` out of GitHub Actions.

### Recommendations (prioritized)

1. **P0 — TOOL-SESSION-10.** In `tooling/pr-size/run-pr-size.ts`, stop passing the name `origin/main` to `git merge-base`. Resolve the remote whose fetch URL is `github.com/logandelafosse/french-writing-prompter` (`github` in agent worktrees, `origin` in Actions) and merge-base `refs/remotes/<that-remote>/main`. Exit 1 when that remote is missing. Print the ref name in the result message. Add a case in `tooling/pr-size/pr-size.integration.test.ts` that calls `runPrSize` with no `baseRef`: a stale `refs/heads/origin/main` plus `refs/remotes/github/main` at the true base must report the small total. A second case, GitHub remote named `origin` and no local branch of that name, must still pass so `check.yml` keeps working. TOOL-SESSION-6 still says to read the board from `origin/main`; when that script is written, use `github/main`.
2. **P0 — TOOL-SESSION-11.** Delete `issueOf = (id) => Number(id.slice(1)) + 2` in `scripts/sync-ticket-issues.mjs`. Read an explicit issue number from the ticket file. Before `gh issue edit`, run `gh issue view <n> --json title,isPullRequest` and exit non-zero when `isPullRequest` is true or the title does not contain the ticket id. Until that guard exists, do not run the script for T36–T39.
3. **Docs-only gates stay TOOL-SESSION-2 (P0) and TOOL-SESSION-5 (P1).** This session did not make them worse. `lefthook.yml` `pre-push` is still full `npm run check`, and `check.yml` still runs e2e on every push to `main`. T39's install wrapper does not skip either gate. It only shows that `LEFTHOOK=0` never was a docs-push escape hatch: the lefthook binary ignores it. No new row.
4. **P2 — TOOL-SESSION-12 and TOOL-SESSION-13.** Follow-ups from #104. The merged behavior already refuses a `file:` URL inside `runVercelBuild` and keeps `npm run build` as `next build`.
5. **Workflow, this commit.** Board reads use `github/main`. The implementer model stays unset: the Task tool rejects `cursor-grok-4.6-high-fast`, and `composer-2.5-fast` stays unused. The GitHub-mirror paragraph tells coordinators to skip `sync-ticket-issues.mjs` for T36–T39 until TOOL-SESSION-11.

### TOOL-SESSION backlog (T36–T39 arc)

| ID              | Pri | Change                                                                                            |
| --------------- | --- | ------------------------------------------------------------------------------------------------- |
| TOOL-SESSION-10 | P0  | `pr:size` merge-base is `refs/remotes/<github-remote>/main`; refuse ambiguous `origin/main`       |
| TOOL-SESSION-11 | P0  | `sync-ticket-issues` reads an explicit issue id and refuses pull requests; drop ticket number + 2 |
| TOOL-SESSION-12 | P2  | #104 follow-up: test spawns the Vercel build wrapper                                              |
| TOOL-SESSION-13 | P2  | #104 follow-up: fail if a future `prebuild` script calls migrate                                  |

Reviewer: session-efficiency review of the T37 hosting arc.
