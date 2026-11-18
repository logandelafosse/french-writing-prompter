# T37 — Migrate on the Vercel build

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 5     | AFK  | T36        | ~80                     |

**User stories**

- As Logan, I want each deploy to apply `drizzle/` to that environment's database, so that production is never a lambda that assumes a schema nobody migrated.
- As an agent, I want `npm run build` and Playwright to keep building with no database, so that CI stays offline.

**What to build**

Add a `build:vercel` wrapper that exits non-zero unless `DATABASE_URL` is `libsql:` or `https:`, then runs `tsx scripts/migrate.ts` and `next build`. The refusal lives in the wrapper. `scripts/migrate.ts` still defaults to `file:./data.db`, because `predev`, `prestart`, and `npm run db:migrate` are the laptop path and must keep migrating that file. `npm run build` remains `next build`.

Add `vercel.json` with `buildCommand` `npm run build:vercel` and `regions` `["cle1"]`.

Replace the README "Deploy on Vercel" scaffold (the `create-next-app` paragraph and the `vercel.com/new` link) with a short pointer at this file. T35 still rewrites the rest of the README.

**Acceptance criteria**

- [ ] `[unit]` The build-vercel guard throws when `DATABASE_URL` is unset and when it is `file:./data.db`.
- [ ] `[unit]` The guard allows a `libsql://` URL through to `migrateWithBackup` (the migrator can be the existing function; assert it was invoked with that URL).
- [ ] `[check]` `npm run build` is exactly `next build`. `playwright.config.ts` `webServer` still sets `file:./.e2e/e2e.db` and `AI_CLIENT=fake` and still invokes `npm run build`, not `build:vercel`.
- [ ] `[check]` `vercel.json` `regions` is `["cle1"]` and `buildCommand` is `npm run build:vercel`.
- [ ] `[check]` README no longer contains `vercel.com/new` or the create-next-app deploy paragraph, and it links to `docs/plan/vercel-deployment.md`.
- [ ] `[unit]` `databaseUrlToFilePath("libsql://x.turso.io")` is null, and the existing `migrateWithBackup` file-backup tests still pass (`src/db/migrate-backup.test.ts`). CI never opens a remote URL.

**Tests to write first**

- `build:vercel › refuses a file DATABASE_URL`
- `build:vercel › calls migrate for a libsql URL`

**Out of scope**

- Creating the Vercel project (T40).
- Turso branches and the one-time import (T40).
- Migrating inside a route or on cold start.
- Editing `check.yml` (T39).

**References**

- `package.json` scripts, `src/db/migrate-run.ts`, `playwright.config.ts`, `README.md` "Deploy on Vercel"
- ADR 0001
