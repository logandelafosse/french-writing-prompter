# T39 — CI stays the merge gate

GitHub issue: #99

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 5     | AFK  | —          | ~15                     |

**User stories**

- As Logan, I want `check` and `e2e` to remain the only required checks, so that a preview deploy cannot merge a red PR.
- As an agent, I want `npm ci` on Vercel and in Actions to skip lefthook, so that T12's `prepare` script cannot fail the install.

**What to build**

In `.github/workflows/check.yml`, set `LEFTHOOK=0` on jobs `check` and `e2e` so it is present for `npm ci`. Do not add a Vercel CLI step, a `VERCEL_TOKEN`, or a preview `baseURL`.

Playwright's server command and `assertE2eDatabaseUrl` stay as they are. This ticket is the workflow env plus a regression check that the workflow file contains `LEFTHOOK=0` and does not contain `vercel deploy`.

**Acceptance criteria**

- [ ] `[check]` Both jobs set `LEFTHOOK: "0"` in the workflow env before `npm ci`.
- [ ] `[check]` `check.yml` has no `vercel` step and no `VERCEL_TOKEN`.
- [ ] `[check]` `playwright.config.ts` `baseURL` is `http://127.0.0.1:3100` and the webServer database is `file:./.e2e/e2e.db`.
- [ ] `[unit]` `assertE2eDatabaseUrl("libsql://consigne-preview.turso.io")` throws, and `assertE2eDatabaseUrl("file:./data.db")` throws.

**Tests to write first**

- `e2e database guard › rejects a turso URL` (extend `src/server/e2e-database.test.ts` if the file case is already there)
- A small test or `check` assertion that reads `.github/workflows/check.yml` and requires `LEFTHOOK`

**Out of scope**

- Branch protection toggles in the GitHub UI (T40).
- Installing the Vercel Git integration (T40).
- Changing what `npm run check` runs.

**References**

- `.github/workflows/check.yml`, `playwright.config.ts`, `src/server/e2e-database.ts`
- T12 spec, tooling-review §7
