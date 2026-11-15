# T12 — Lefthook pre-commit

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 0     | AFK  | T08        | ~30 config              |

## User stories

- As an agent implementing a ticket, I want formatting, lint, ast-grep and typecheck to run on my staged files at commit time, so that I see violations in seconds instead of after CI.
- As Logan as maintainer, I want agents unable to skip hooks with `--no-verify`, so that the local gate means something (CI is still the real gate).

## What to build

Lefthook installs into the app's own repo (T00), never into `~/Personal-Projects`. `lefthook.yml` follows `tooling-review.md` §7.

`pre-commit` runs in parallel:

- Prettier `--write` on staged `ts/tsx/css/md/json/yml/yaml` files, with `stage_fixed: true`.
- ESLint `--max-warnings=0` on staged `ts/tsx`.
- `ast-grep scan` on staged `ts/tsx/css` (always the `ast-grep` binary, never `sg`).
- `tsc --noEmit` when any `ts/tsx` file is staged.

`pre-push` runs `npm run check`.

A `prepare` script runs `lefthook install`, so a fresh `npm install` wires the hooks. `npm ci` in CI must still succeed, either because lefthook no-ops there or because CI sets `LEFTHOOK=0`.

`opencode.json` keeps allow-by-default but denies the destructive escapes from §10: `--no-verify`, force push, `rm -rf`, and `sqlite3 data.db`. Verify the exact permission syntax against the opencode docs. `AGENTS.md` already says never to use `--no-verify` (T08). This ticket doesn't repeat it.

## Acceptance criteria

- [ ] `[check]` After `npm install`, `git rev-parse --git-path hooks` resolves inside the app directory and contains lefthook's `pre-commit` and `pre-push`; `~/Personal-Projects/.git/hooks` is unchanged.
- [ ] `[check]` Staging a file containing `new Date().toISOString().split("T")[0]` and running `git commit` is rejected by the ast-grep hook.
- [ ] `[check]` Staging a component with a floating promise is rejected by the ESLint hook; staging a type error is rejected by the typecheck hook.
- [ ] `[check]` Staging a mis-formatted but valid file commits successfully and the committed version is Prettier-formatted.
- [ ] `[check]` `git push` runs `npm run check` and aborts the push when it fails.
- [ ] `[check]` A commit touching only `docs/**/*.md` runs Prettier but skips ESLint, ast-grep and typecheck.
- [ ] `[check]` CI's `npm ci && npm run check` job still passes.
- [ ] `[check]` `opencode.json` denies `*--no-verify*`, `git push --force*`, `git push -f*`, `rm -rf *` and `sqlite3 data.db*`, and is valid against its `$schema`.

## Tests to write first

This is configuration, so the failing tests are scripted repo checks. Run them in a throwaway clone so the real history isn't touched, record them in the PR body, and confirm each fails before `lefthook.yml` exists:

- "commit with a UTC date key is rejected"
- "commit with a type error is rejected"
- "mis-formatted file is fixed and staged"
- "docs-only commit skips code hooks"
- "push runs check"

There is no Vitest test, since a unit test can't observe git hooks meaningfully.

## Out of scope

- After-edit agent hooks (Cursor/Claude `PostToolUse`) running ast-grep and ESLint per file (P2 in §10, not on the board).
- New lint or ast-grep rules (T07, T08).
- Changing what CI runs (T02, T11).

## References

- `docs/agents/tooling-review.md` §7 (lefthook config, CI is the gate), §10 (`opencode.json` denies), §12 TOOL-11.
- `docs/agents/workflow.md` step 4 (local gate).
