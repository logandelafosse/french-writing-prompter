# Vercel deployment

Status: **§7 accepted 2026-11-18** · App: Consigne (`logandelafosse/french-writing-prompter`, public)

Hosting plan for the Next.js app. Tickets: `docs/plan/tickets/T36-*.md` … `T40-*.md`. AFK work is T36–T39; T40 is HITL cutover in the dashboards after those land.

The repo is **Next.js 16.2.6** and **React 19.2.4** (`package.json`). The Vercel framework preset is still Next.js. `next.config.ts` is empty, which is what we want: there is no `output: "export"`, and the app has server route handlers (`src/app/api/prompt`, `evaluate`, `placement`, `quota`, `level`, `sessions`). Node.js on Vercel matches CI: `.github/workflows/check.yml` pins Node 20. There is no `engines` field; the Vercel project setting is the pin. Leave `engines` alone so a newer local Node keeps working.

Local `npm run dev` stays on `file:./data.db`. Vercel is a second copy of the tutor for when the laptop is closed. Tests stay on `:memory:` and Playwright stays on `file:./.e2e/e2e.db`.

## 1. Goals

| Question          | Decision                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preview per PR?   | Yes. One shared **preview** Turso database for every PR. `AI_CLIENT=fake`. Disposable rows. Logan uses it to click a PR on a phone. It is a UI sandbox, and it is not the merge gate. |
| Production?       | Yes, from `main` only. One **production** Turso database holding Student Writing. `AI_CLIENT=openai`.                                                                                 |
| Who owns secrets? | Logan, in the Vercel project env and the Turso account. `.env*` stays gitignored. GitHub Actions does not receive `OPENAI_API_KEY`, `DATABASE_URL`, or the libsql token.              |

Also in scope:

- The daily quota uses Logan's calendar day. On Vercel the process timezone is UTC, so `APP_TIME_ZONE` is mandatory there (`src/lib/dates.ts` falls back to `Intl.DateTimeFormat().resolvedOptions().timeZone`, which is the defect D8 in `docs/plan/backend-requirements.md` §5).
- The deployed URLs are reachable only by Logan. The app has no login. Every API route reads and writes the one learner database and, in production, spends the OpenAI key.
- Migrations run once per Vercel build, against that environment's database. The laptop keeps `predev` / `prestart`.

Out of this plan: app-level accounts, a custom domain, Playwright against the preview URL, per-PR databases, and pointing `npm run dev` at Turso.

Phase placement: **Phase 5 — Host**, parallel with T13+. The tutor redesign does not wait on it. Production cutover waits on T36–T38 and on §7. T35 still owns the full README rewrite; until then the scaffold "Deploy on Vercel" section in `README.md` is wrong for this app (it sends a reader to a stock `create-next-app` deploy that would boot `file:./data.db`).

## 2. Blockers today

These are properties of this tree, not generic serverless advice.

### `file:./data.db` has nowhere to live

`getEnv()` defaults `DATABASE_URL` to `file:./data.db` (`src/server/env.ts`). `databaseUrlToFilePath()` resolves that relative to `process.cwd()` (`src/db/database-url.ts`). The Drizzle client is `@libsql/client` via `createClient({ url })` (`src/db/libsql-client.ts`) and `drizzle-orm/libsql` (`src/db/index.ts`). Schema is `sqliteTable` (`src/db/schema.ts`). `drizzle.config.ts` already sets `dialect: "turso"` and the same default URL.

Vercel functions have no durable disk. A `file:` URL under the deployment directory is read-only, and anything under `/tmp` is per instance and disappears. Learner sessions, drafts, and Dialect Notes would not survive the next cold start, and two instances would not share them. Backend requirements §5 D8 describes "a single-user app whose server runs on the learner's machine." That sentence is the localhost design. It stops being true on Vercel until the URL is a remote libsql database.

`*.db` is gitignored, including `data.db`. The file is personal Student Writing. CI already refuses to open it: Vitest sets `DATABASE_URL=:memory:` and `getEnv()` throws if Vitest sees anything else; `assertVitestDatabaseUrl()` throws on `libsql:`, `http:`, and `https:` (`src/db/database-url.ts`). Keep that refusal. A Vercel ticket that "just sets DATABASE_URL in CI" would aim the suite at Turso.

Guard on `VERCEL=1`, which the platform sets for builds and runtime. Do not guard on `NODE_ENV=production`. Playwright's `webServer` runs `npx next start`, which is production mode, against `file:./.e2e/e2e.db` (`playwright.config.ts`). A production-mode file ban breaks e2e.

### libsql has no auth token

`createLibsqlClient` passes only `{ url }`. `scripts/migrate.ts` opens a second client the same way (`createClient({ url: databaseUrl })`) for `backfillSessionsLocalDate`. A Turso URL (`libsql://<db>-<org>.turso.io`) rejects that handshake. The token has to be a separate env var on `createClient({ url, authToken })`, plumbed through `getEnv()`, and added to `drizzle.config.ts` `dbCredentials` for `db:studio`. It must not be embedded in `DATABASE_URL`.

`databaseUrlToFilePath("libsql://x.turso.io")` already returns null (`src/db/database-url.test.ts`). Remote URLs skip the file backup on purpose.

### Migrations never run on Vercel

`package.json` runs `tsx scripts/migrate.ts` as `predev` and `prestart` only. `npm run build` is `next build` with no migrate step. Vercel builds with `next build` and then runs the server output itself. It does not run `npm start`, so `prestart` never fires. A remote database would stay at whatever schema it was created with.

`migrateWithBackup` (`src/db/migrate-run.ts`):

1. Resolves a file path. For `libsql:` that is null, so `fs.copyFileSync` does not run and there is no `data.db.bak-<timestamp>`.
2. Reads `drizzle/` from `process.cwd()` via `readMigrationFiles` (`MIGRATIONS_FOLDER`).
3. Applies pending SQL with `drizzle-orm/libsql/migrator`.

That filesystem read works in the Vercel build checkout, where `drizzle/0000_baseline.sql` and `drizzle/0001_sessions_quota.sql` are on disk. It is the wrong place inside a lambda: Next traces imports, and these SQL files are loaded with `fs`. Do not migrate from a route handler, from `instrumentation.ts`, or on cold start. Concurrent instances would race, and the `.bak-` copy is meaningless for a remote URL.

`createLibsqlClient` calls `getEnv()`. `getEnv()` requires `OPENAI_API_KEY` whenever `AI_CLIENT` is `openai` (the default). So a build that migrates under the production env needs the key present at **build** time, even though `next build` itself does not call OpenAI. Marking the key "runtime only" in Vercel makes the migrate step throw `EnvError` before any SQL.

ADR 0001 stays true for the laptop: file backups and `predev` / `prestart` remain. Remote backups are a Turso branch or dump taken by Logan, not a `.bak-` file.

### Playwright e2e and previews are different servers

`.github/workflows/check.yml` job `e2e` runs after `check`, on `ubuntu-latest`, with `npx playwright install --with-deps chromium` and `npm run test:e2e`. Playwright then:

- Builds and starts `http://127.0.0.1:3100` (`playwright.config.ts`).
- Forces `DATABASE_URL=file:./.e2e/e2e.db`, `AI_CLIENT=fake`, and an empty `OPENAI_API_KEY`.
- Calls `npx next start`, so it skips `prestart`. `e2e/global-setup.ts` and `scripts/e2e-prepare.ts` migrate the `.e2e` file.
- `assertE2eDatabaseUrl()` throws unless the path is under `.e2e/` (`src/server/e2e-database.ts`). `file:./data.db` throws. A `libsql:` URL throws (`E2E requires a file: DATABASE_URL`).
- Sends `x-e2e-scenario`. `getAiClient()` honors that header only when `AI_CLIENT=fake` (`src/server/ai-client.ts`). A preview with `AI_CLIENT=openai` ignores it and calls `gpt-4o` (`src/config/ai.ts`).

Pointing this suite at a preview URL would either fail the database guard or, if the guard were weakened, truncate the preview database and spend OpenAI. The merge gate keeps booting its own server. The preview is for Logan.

`check` already runs `npm run build`, and e2e builds again inside `webServer` (timeout 300s). A third `vercel deploy` in the same workflow repeats that build and puts a `VERCEL_TOKEN` in GitHub.

### Lefthook can fail `npm ci` on Vercel

T12 (in review, PR #49; not in this working tree — `package.json` has no `prepare` script and there is no `lefthook.yml`) adds `prepare: lefthook install` and a `pre-push` hook that runs `npm run check`. T12's own acceptance says `npm ci` in CI must still pass, either because lefthook no-ops or because CI sets `LEFTHOOK=0`. `check.yml` does not set `LEFTHOOK=0` today.

Vercel installs with the lockfile (`package-lock.json` is present) and will run `prepare` too. Hooks are a laptop convenience (`docs/agents/tooling-review.md` §7: CI is the gate). The Vercel build and both GitHub jobs need `LEFTHOOK=0` so hook install cannot fail the deploy. Lefthook does not run in the build, and it does not deploy anything.

### OpenAI calls outlive a short function

`OpenAiClient` sets `timeout: 30000` and `maxRetries: 2` (`src/modules/openai-client/openai-client.ts`). One request can take about 90 seconds before the SDK gives up. Routes that call `getAiClient()` today:

- `src/app/api/prompt/route.ts`
- `src/app/api/evaluate/route.ts`
- `src/app/api/placement/route.ts`

None export `maxDuration`. If the platform kills the function first, the learner gets Vercel's HTML error page. The app's error envelope never runs. `maxDuration` has to sit above that 90s budget. Whether the Vercel account allows it is Q9.

### Later ticket that will assume a laptop path

T24 reads the DLF lexicon from DLF-extract (`../DLF-extract/out/canonical.jsonl` in the plan). A Vercel function cannot see Logan's home directory. T24's artifact has to be a committed, versioned file in this repo (Q6 already chose a pinned lexicon artifact). Called out here so the host plan and T24 do not invent two stories. No T24 work in the tickets below.

## 3. Recommended Vercel project shape

One Vercel project, linked to `logandelafosse/french-writing-prompter`. Framework preset **Next.js** (detected). Node **20.x**. Install command `npm ci`. Package manager npm, matching CI.

| Setting                | Value                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| Production branch      | `main`                                                                       |
| Function region        | `cle1` only (Cleveland, closest Vercel region to America/Chicago)            |
| Turso primary          | `ord` (Chicago), one group, two databases: `consigne` and `consigne-preview` |
| Build command          | `npm run build:vercel` (new script, T37)                                     |
| GitHub `npm run build` | stays `next build`                                                           |
| Install env            | `LEFTHOOK=0` on Production, Preview, and Development                         |

One region because there is one writer and one Turso primary. Quota is a count of today's rows in that database (`src/modules/quota-manager/quota-store.ts`). A second region would only add cross-country reads.

`vercel.json` (added by T37) carries `buildCommand` and `regions`. It does not set `output`. It does not add redirects or headers as a substitute for login.

### Env matrix

All four app variables already exist on `EnvSchema`. `LIBSQL_AUTH_TOKEN` is new. None of them are `NEXT_PUBLIC_`. `process.env` outside `src/server/env.ts` is already banned (`tooling/ast-grep/rules/no-process-env.yml`). `scripts/migrate.ts` and `drizzle.config.ts` live outside `src/` and may read `process.env`; they still have to use the same names.

| Variable            | Local `npm run dev`                | Vitest                  | Playwright           | Vercel Preview                   | Vercel Production                   |
| ------------------- | ---------------------------------- | ----------------------- | -------------------- | -------------------------------- | ----------------------------------- |
| `OPENAI_API_KEY`    | Logan's key in `.env`              | unset                   | empty                | unset                            | secret, build and runtime           |
| `DATABASE_URL`      | unset (default `file:./data.db`)   | `:memory:`              | `file:./.e2e/e2e.db` | `libsql://` preview DB           | `libsql://` production DB           |
| `LIBSQL_AUTH_TOKEN` | unset                              | unset                   | unset                | preview token, build and runtime | production token, build and runtime |
| `APP_TIME_ZONE`     | unset (laptop zone)                | unset; tests pass `now` | unset                | `America/Chicago`                | `America/Chicago`                   |
| `AI_CLIENT`         | `openai`, or `fake` for offline UI | `fake`                  | `fake`               | `fake`                           | `openai`                            |
| `LEFTHOOK`          | unset                              |                         |                      | `0`                              | `0`                                 |
| `VERCEL`            | unset                              | unset                   | unset                | `1` (platform)                   | `1` (platform)                      |

Rules to enforce in `EnvSchema` when `VERCEL=1`:

- `DATABASE_URL` scheme is `libsql:` or `https:`. `file:` throws `EnvError`.
- `LIBSQL_AUTH_TOKEN` is non-empty.
- `APP_TIME_ZONE` is non-empty. Set it to `America/Chicago` (Vitest already runs with `TZ=America/Chicago`; Q11 confirms).
- `AI_CLIENT=openai` still requires `OPENAI_API_KEY`. Preview's `fake` value is what lets preview builds migrate with no key.

`createLibsqlClient` passes `authToken` only when the token is non-empty. `scripts/migrate.ts` drops its raw `createClient({ url })` and uses that factory for the backfill connection too, so the token cannot be forgotten on one of the two connections.

Local and Vitest behavior stays. Unset `VERCEL` still defaults the file URL and still allows a missing token and a missing timezone.

Dashboard values are environment-scoped. Preview and Production do not share `DATABASE_URL`. A preview build that migrates production would apply an unmerged `drizzle/*.sql` to Student Writing.

## 4. Database options

Ranked for this codebase. The schema is SQLite: `integer PRIMARY KEY AUTOINCREMENT`, `text` timestamps, JSON stored as `text`, and `drizzle/0001_sessions_quota.sql` uses `ALTER TABLE` plus `DROP TABLE daily_quota`. Tests build that same DDL in libsql memory (ADR 0001). `docs/agents/tooling-review.md` already listed `@neondatabase/serverless` as an unused dependency to remove; it is not in `package.json` now.

### 1. Turso remote libsql — use this

The driver, the Drizzle dialect (`turso`), the migrator (`drizzle-orm/libsql/migrator`), and the SQL files stay. The work is the token, the `VERCEL=1` file-URL ban, and running `scripts/migrate.ts` from the Vercel build.

Remote libsql speaks the same SQL as `file:./data.db`. `:memory:` tests keep refusing network URLs, so the suite cannot wipe the learner database. A single user is well inside Turso's small-database tier. HTTP from a Node function fits a stateless lambda; there is no pool to size.

File backups do not apply. Before the first production migration Logan takes a Turso branch or a dump. `predev` on the laptop still writes `data.db.bak-*` when the URL is a file.

Embedded replicas (`file:` plus `syncUrl`) are a local-disk feature. Vercel has no durable file to sync. The client stays a remote URL plus token.

Preview and production are two databases in one group, both in `ord`. One preview database is enough: Logan reviews one PR at a time. Two PRs that migrate that shared database at the same moment can collide; that is acceptable in a one-developer repo. Production migrates only from `main` builds, so a bad PR migration stops at preview.

### 2. Neon — only if we leave SQLite

A Neon Postgres database would be a new driver (`drizzle-orm` neon HTTP or `pg`), a rewrite of `src/db/schema.ts` off `sqliteTable`, and a new baseline. `drizzle/0000_baseline.sql` and `0001_sessions_quota.sql` use SQLite DDL (`AUTOINCREMENT`) and cannot be applied to Postgres. ADR 0001 says the test database is built from those files. Keeping libsql for tests and Postgres for Vercel splits that contract in two.

Neon branching is a real preview feature. This app does not need a branch per PR (one disposable preview database is the preview story above). The cost of the port lands before any of that is useful.

Choose Neon later if Turso's limits or SQLite's `ALTER TABLE` rules actually block a migration. Nothing in T13–T35 requires Postgres.

### 3. Vercel Postgres — same port, less ownership

Vercel Postgres is Neon sold through the Vercel marketplace. The schema rewrite, the new migrator, and the test-database split are the same as connecting to Neon directly. The connection string then lives inside the Vercel integration instead of a database Logan can dump without the hosting account. There is no SQLite compatibility layer. `tooling-review.md` already dropped the unused Neon client once. Re-adding it for the marketplace wrapper does not help Consigne.

## 5. CI/CD

Use the **Vercel Git integration**. Do not add `vercel deploy` to `.github/workflows/check.yml`.

`check.yml` is already the merge gate:

1. Job `check` on `pull_request` and on `push` to `main`: `npm ci`, `npm run check`, `npm run build`, and `npm run pr:size` on PRs.
2. Job `e2e` needs `check`, then installs Chromium and runs `npm run test:e2e`.

Branch protection on `main` requires both job names before merge. A Vercel preview can be green while `e2e` is red. Merging still waits on the two jobs. That is the point of keeping them as the gate.

After merge, the commit on `main` has already passed those jobs. The Git integration deploys that commit to production. The `push: main` re-run in Actions is a second execution of the same suite, not the deploy trigger.

Why the CLI-in-Actions path is the worse fit here:

- `check` builds, e2e builds again, and `vercel deploy` would build a third time.
- The CLI needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` in GitHub. The migrate step would also need the Turso token in GitHub if it ran there. CI today has neither, and e2e is written so it cannot see them (`assertE2eDatabaseUrl`, Vitest's URL refusal).
- Running both the Git integration and `vercel deploy` deploys twice.

Secrets stay in Vercel. The build command migrates using the environment-scoped `DATABASE_URL` that Vercel already injects. Preview builds migrate `consigne-preview`. Production builds migrate `consigne`.

`npm run build` stays free of side effects so `check` and Playwright keep building with no database. The new script is `build:vercel`: run `tsx scripts/migrate.ts`, then `next build`. It exits non-zero when `DATABASE_URL` is missing or `file:`, so a laptop `npm run build:vercel` cannot migrate `data.db` by accident. `predev` and `prestart` stay for local `npm run dev` and `npm start`.

Lefthook: set `LEFTHOOK=0` on the workflow (`check` and `e2e`, before `npm ci`) and on the Vercel project. T12 can merge without taking the Vercel install down.

Preview deploys start in parallel with Actions, so a preview URL can exist before `e2e` finishes. The preview uses `AI_CLIENT=fake`, so a red PR does not call `gpt-4o`.

Deployment Protection (Vercel Authentication, Logan's account) is on for Preview and Production before the production database gets a real writing. The URL is the only lock on `/api/sessions` and `/api/evaluate`.

## 6. Proposed tickets

Phase 5. Estimates are production lines, tests excluded, same budget as the rest of the board (`npm run pr:size`, 500). File them as sub-issues of GitHub #1 when Logan accepts §7. Do not pre-assign issue numbers.

T36, T38, and T39 can start immediately (T12 already landed — T39 still adds `LEFTHOOK=0` to Actions). T37 follows T36. T40 is HITL cutover after T36–T38 and the accepted §7 answers.

### T36 — Remote libsql client, file URL refused on Vercel

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 5     | AFK  | —          | ~120                    |

**User stories**

- As Logan, I want the deployed app to refuse `file:./data.db`, so that a missing env var cannot look like a successful boot while writing into an ephemeral disk.
- As Logan, I want the libsql token to be its own secret, so that it never shows up inside `DATABASE_URL` or a log line.

**What to build**

Extend `EnvSchema` with optional `LIBSQL_AUTH_TOKEN`. When `VERCEL=1`, require a `libsql:` or `https:` `DATABASE_URL`, a non-empty token, and a non-empty `APP_TIME_ZONE`. When `VERCEL` is unset, keep today's defaults (`file:./data.db`, token optional, timezone optional).

`createLibsqlClient` passes `authToken` through to `createClient`. `scripts/migrate.ts` uses that factory for the backfill connection and deletes the raw `createClient({ url })`. `drizzle.config.ts` passes the token in `dbCredentials` when it is set.

The Vitest refusal stays: `:memory:` only inside `getEnv()` under Vitest, and `assertVitestDatabaseUrl` still throws on `libsql:` / `http:` / `https:`. The new checks key off `VERCEL`, so Playwright's production-mode `next start` against `.e2e/e2e.db` still boots.

`EnvError.variableNames` includes the failing names. The message does not echo the token.

**Acceptance criteria**

- [ ] `[unit]` With `VERCEL=1` and `DATABASE_URL` unset, `getEnv()` throws `EnvError` naming `DATABASE_URL` (the schema default is `file:./data.db`, and that default is what a forgotten Vercel env var becomes). The same throw happens when the URL is set to `file:./data.db` explicitly.
- [ ] `[unit]` With `VERCEL=1`, a `libsql://` URL, and no token, `getEnv()` throws `EnvError` naming `LIBSQL_AUTH_TOKEN`.
- [ ] `[unit]` With `VERCEL=1`, a remote URL, a token, and no `APP_TIME_ZONE`, `getEnv()` throws `EnvError` naming `APP_TIME_ZONE`.
- [ ] `[unit]` With `VERCEL` unset, `getEnv()` still defaults `DATABASE_URL` to `file:./data.db` and still allows a missing token and a missing timezone.
- [ ] `[unit]` `createLibsqlClient` calls `createClient` with `{ url, authToken }` when the token is set, and with `{ url }` when it is not.
- [ ] `[unit]` Under Vitest, a `libsql://` URL still throws `Refusing to open … under Vitest`.
- [ ] `[check]` `scripts/migrate.ts` has no direct `createClient(` call. In production code, `authToken` appears only in `src/db/libsql-client.ts`, `src/server/env.ts`, and `drizzle.config.ts`.

**Tests to write first**

- `getEnv › file URL on Vercel throws`
- `getEnv › remote URL on Vercel requires token and timezone`
- `getEnv › local default stays file:./data.db` (stub `VITEST` off and unset `DATABASE_URL`; `vitest.config.ts` sets both, and `src/server/env.test.ts` currently sees `:memory:` because of that)
- `createLibsqlClient › forwards authToken`
- `assertVitestDatabaseUrl › still rejects libsql`

**Out of scope**

- The Vercel project, Turso databases, and real tokens (T40).
- Running migrations on the Vercel build (T37).
- `maxDuration` (T38).
- Changing `predev` / `prestart`.

**References**

- `src/server/env.ts`, `src/db/libsql-client.ts`, `src/db/database-url.ts`, `scripts/migrate.ts`, `drizzle.config.ts`
- ADR 0001, backend-requirements §5 D8 and §2.1

### T37 — Migrate on the Vercel build

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

### T38 — Function duration covers the OpenAI client

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 5     | AFK  | —          | ~40                     |

**User stories**

- As Logan, I want an Evaluation that runs for the client's full timeout to finish inside the function, so that a slow `gpt-4o` response comes back as the app's JSON error (or the real Evaluation) rather than an HTML platform page.

**What to build**

`OpenAiClient` uses `timeout: 30000` and `maxRetries: 2`, so one call can last about 90s. Add `AI_ROUTE_MAX_DURATION` in `src/config/ai.ts` (next to `AI_MODEL`) at 120 seconds. Export `maxDuration` from each route that calls `getAiClient()` today: `src/app/api/prompt/route.ts`, `src/app/api/evaluate/route.ts`, `src/app/api/placement/route.ts`.

Next may require the exported `maxDuration` to be statically analyzable. If an imported constant is dropped at build, repeat the numeric literal in each route and add a unit test that those literals equal `AI_ROUTE_MAX_DURATION`. One source of the number either way.

**Acceptance criteria**

- [ ] `[unit]` `AI_ROUTE_MAX_DURATION` is greater than or equal to `(timeoutMs / 1000) * (maxRetries + 1)` for the values in `OpenAiClient` (30 × 3 = 90), and the exported value is 120.
- [ ] `[check]` Each of the three route modules exports `maxDuration` equal to that constant.
- [ ] `[check]` `npm run build` succeeds with the exports in place.
- [ ] `[check]` Routes that do not call the AI client (`quota`, `level`, `sessions`) do not export `maxDuration`.

**Tests to write first**

- `AI_ROUTE_MAX_DURATION › covers timeout times attempts`
- `ai routes › export that duration`

**Out of scope**

- Changing the SDK timeout or retry count.
- New evaluate paths from T21. That ticket exports the same constant when it adds a route.
- Confirming the Vercel account allows 120s (Q9, checked in T40).

**References**

- `src/modules/openai-client/openai-client.ts`, `src/config/ai.ts`

### T39 — CI stays the merge gate

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

### T40 — Project, secrets, protection, import

| Phase | Type | Blocked by            | Production lines (est.) |
| ----- | ---- | --------------------- | ----------------------- |
| 5     | HITL | T36, T37, T38, Q9–Q15 | ~0                      |

**User stories**

- As Logan, I want a protected production URL on Turso with my real key and timezone, so that I can write when the laptop is off, and a preview URL that cannot see that database.

**What to build**

Logan does this in the dashboards. No application code unless a dump command has to be written down in the PR description.

1. Create the Vercel project from the GitHub repo. Framework Next.js, Node 20.x, production branch `main`, install `npm ci`.
2. Create a Turso group in `ord` with databases `consigne` and `consigne-preview`.
3. Enter the §3 matrix. Preview and Production use different URLs and tokens. `LEFTHOOK=0` on every Vercel environment. `OPENAI_API_KEY`, `DATABASE_URL`, and `LIBSQL_AUTH_TOKEN` are available at build and runtime in the environments that need them (production needs the key at build because migrate calls `getEnv()`).
4. Turn on Deployment Protection for Preview and Production before the production database is used for real writing.
5. Confirm the account accepts `maxDuration` 120 (Q9). Deploy a `main` build and read the build log: migrate applied `drizzle/` to `consigne`, and the function loaded `@libsql/client`. If the native binding fails at import, a follow-up ticket adds `serverExternalPackages: ["@libsql/client"]` in `next.config.ts`. Do not add that before a failure.
6. Set an OpenAI usage cap on the key used in production.
7. Import decision (Q12): if `data.db` has real Student Writing, dump it into `consigne` once, then compare `select count(*) from sessions`. If it only has test residue, leave `consigne` empty and keep the file as the local database. Local `.env` stays on the file URL (Q13).
8. Confirm GitHub branch protection requires the `check` and `e2e` jobs.

**Acceptance criteria**

- [ ] `[HITL]` A production deployment from `main` serves the app, Deployment Protection challenges an anonymous browser, and a second request after a fresh lambda still sees a session written by the first.
- [ ] `[HITL]` The preview URL for a PR uses `AI_CLIENT=fake` (a generate call returns fixture output and does not appear on the OpenAI usage page) and its `DATABASE_URL` host is the preview database.
- [ ] `[HITL]` `APP_TIME_ZONE` on both environments is the value Logan confirmed (default `America/Chicago`). A session created just after local midnight has `local_date` of that Chicago day, not the UTC day.
- [ ] `[HITL]` GitHub required checks are `check` and `e2e`. A draft PR with a failing test does not merge while its preview is up.
- [ ] `[check]` `sha256` of local `data.db` is unchanged by the import procedure. The import reads a copy.

**Out of scope**

- Rewriting the schema for Postgres.
- Playwright against `VERCEL_URL`.
- A custom domain (Q14).
- App login. Protection is the access control for v1 of hosting.

**References**

- This file §1–§5
- `docs/plan/plan.md` owner-decision table (add Q9–Q15 when accepted)

## 7. Open questions for Logan

**Answered 2026-11-18** (Logan). Tickets may proceed on these decisions.

| ID  | Question                                                 | Decision                                                                                                                          | Blocks |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Q9  | Vercel plan / `maxDuration` 120?                         | **Yes** — account allows 120s. T38 lands the export; T40 verifies on first prod deploy.                                           | T40    |
| Q10 | Preview per PR, `AI_CLIENT=fake`, one shared preview DB? | **Yes.** Production is the only OpenAI caller.                                                                                    | T40    |
| Q11 | Quota TZ `America/Chicago` on Vercel?                    | **Yes.**                                                                                                                          | T40    |
| Q12 | Import `data.db` into prod Turso, or start empty?        | **Agree with default** — inspect first; residue → start empty; real writing → one manual dump + row-count check. Never CI import. | T40    |
| Q13 | Keep laptop `npm run dev` on `file:./data.db`?           | **Yes** — two databases; laptop `.env` stays on the file URL.                                                                     | T40    |
| Q14 | Hostname?                                                | **Agree with default** — `*.vercel.app` behind Deployment Protection; custom domain later.                                        | T40    |
| Q15 | Deployment Protection before real Turso writing?         | **Yes** — Preview and Production.                                                                                                 | T40    |
