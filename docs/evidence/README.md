# PR UI evidence

Captures live under `docs/evidence/<issue-number>/` (or ticket ID like `T11/`).

This repo is **private**. For PR review:

1. Commit PNG/MP4 on the PR branch (Playwright: `E2E_EVIDENCE=<id> npm run test:e2e`).
2. In the PR body, link each file with a **GitHub blob URL** on that branch, e.g.
   `https://github.com/logandelafosse/french-writing-prompter/blob/<branch>/docs/evidence/15/foo.png`
3. Do **not** rely on `raw.githubusercontent.com` or `![](docs/evidence/…)` — they 404 or break on GitHub Android (`appassets.androidplatform.net`).

See `~/.cursor/skills/pr-ui-evidence/SKILL.md` and `docs/agents/workflow.md`.