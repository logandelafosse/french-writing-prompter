# Session efficiency retros

Periodic review of coordinator and implementer sessions for **toil**, **mistakes**, and **token efficiency**. Not a substitute for per-PR adversarial/test/tooling reviews.

## Cadence

The **coordinator** runs a **session efficiency reviewer** (Grok 4.7 high) **every five tickets merged to `main`** (count parent tickets and split slices like T25a/T25b as one parent each unless both merged in the same retro window — default: **one board `Done` row per counted ticket**).

On each retro:

1. Scope the last five merges (PR links, SHAs, fix commits).
2. Append a dated section below (do not delete prior retros).
3. File actionable items as **TOOL-SESSION-N** in the retro’s backlog table and mirror P0–P1 rows into `docs/agents/tooling-review.md` under a `### Session retro` heading.
4. Update `docs/agents/workflow.md` counter: **Next retro after ticket &lt;ID&gt; merges.**

**Last retro:** T27 merged (PR #80, 2026-11-16). **Next retro after:** T32 merges (five tickets: T28–T32), or sooner if Logan requests.

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
8. **P1** — Tier reviews: adversarial always; test/tooling when tests change; post blocking list as PR comment; re-review only the reviewer that blocked.

### TOOL-SESSION backlog (T23–T27 arc)

| ID             | Pri | Change                                               |
| -------------- | --- | ---------------------------------------------------- |
| TOOL-SESSION-1 | P0  | `writingField` + ast-grep ban substring label in e2e |
| TOOL-SESSION-2 | P0  | CI: docs-only `main` push skips e2e                  |
| TOOL-SESSION-3 | P0  | Offline opencode schema test                         |
| TOOL-SESSION-4 | P0  | dev/migrate env loading without OpenAI for local DB  |
| TOOL-SESSION-5 | P1  | Lefthook docs-only pre-push skip                     |
| TOOL-SESSION-6 | P1  | `ticket-worktree` + board from `origin/main`         |
| TOOL-SESSION-7 | P1  | `pr:size` file list + split thresholds               |
| TOOL-SESSION-8 | P1  | Tiered review policy + PR comment trail              |
| TOOL-SESSION-9 | P2  | Export TZ contract test (UTC vs Chicago)             |

Reviewer: [385b4c0e-3ca1-4957-bb34-7657f9afa5b3](385b4c0e-3ca1-4957-bb34-7657f9afa5b3).
