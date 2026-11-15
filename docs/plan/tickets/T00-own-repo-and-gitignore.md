# T00 — Own repo and gitignore

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 0 | HITL (Q1) | None | ~15 |

## User stories

- As Logan as maintainer, I want the app in its own git repo, so that agents can open one PR per ticket and `gh issue` targets the right project.
- As Logan, I want my Student Writing and Dialect Notes in `data.db` never to reach a remote, so that personal data stays on my machine.

## What to build

**Owner question Q1:** repo name, visibility, and whether `~/Personal-Projects` keeps this folder as a submodule or ignores it. **Default if accepted:** a private GitHub repo named `french-writing-prompter`; the parent repo ignores the folder.

Today `git rev-parse --show-toplevel` resolves to `~/Personal-Projects`, where this folder is untracked. After this ticket the folder is its own repo on `main`, pushed to GitHub, and the parent no longer lists it as untracked.

`.gitignore` is extended before the first commit so that no database file, backup, or test artifact is ever staged:

- `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`
- `*.db.bak-*` (T01 writes `data.db.bak-<timestamp>` before migrating)
- `.e2e/`, `playwright-report/`, `test-results/`
- `.env*` stays ignored

The first commit is the current tree as it stands. The local `data.db` file stays where it is and is not committed.

## Acceptance criteria

- [ ] `[check]` From the app directory, `git rev-parse --show-toplevel` prints the app directory, not `~/Personal-Projects`.
- [ ] `[check]` `git log --all --name-only --format= | rg '\.db($|-|\.bak)'` prints nothing.
- [ ] `[check]` `git log --all --name-only --format= | rg '(^|/)\.env'` prints nothing.
- [ ] `[check]` `touch scratch.db scratch.db.bak-x && git status --porcelain` lists neither file.
- [ ] `[check]` `gh repo view --json name,visibility` reports the name and visibility Logan chose for Q1.
- [ ] `[check]` `git -C ~/Personal-Projects status --porcelain` no longer shows `?? french-writing-prompter/`, and the parent does not track any file inside it, unless Logan chose the submodule option.
- [ ] `[check]` `gh issue list` from the app directory runs against the new repo, as `docs/agents/issue-tracker.md` describes.

## Tests to write first

None. This ticket has no runtime behaviour; every criterion above is a shell check the reviewer runs.

## Out of scope

- Test DB isolation, migrations, backups (T01).
- CI workflow and `check` script (T02).
- Lefthook hooks (T12). They need this repo to exist, but they are installed later.
- Rewriting `opencode.json` permissions (T08).

## References

- `docs/agents/tooling-review.md` §1 (Git, `.gitignore` rows) and §12 TOOL-0.
- `docs/plan/backend-requirements.md` §0 D15 and §6.1 (why git history matters for Dialect Notes).
- `docs/plan/plan.md` owner question Q1.
- `docs/agents/issue-tracker.md`.
