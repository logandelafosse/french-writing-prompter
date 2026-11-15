# T01 — Isolated test DB and generated migrations

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 0 | AFK | T00 | ~150 |

## User stories

- As Logan, I want `npm test` to never touch `data.db`, so that running the suite can't delete my Student Writing again.
- As an agent implementing a ticket, I want a fresh migrated database in every test file, so that I can test stores against the exact production schema.
- As Logan as maintainer, I want schema changes to ship as reviewed migration files and my DB backed up before they run, so that a migration can't lose learner content.

## What to build

Today `history-store.test.ts` calls `db.delete(sessions)` against the real `data.db`, because `src/db/index.ts` falls back to `file:./data.db` and Vitest sets no env. The real DB now holds only residue of that test: session 35 with `evaluation_json = {"score": 5}` and `prompt_constraints = {}`.

**Test isolation.** Vitest sets `DATABASE_URL=":memory:"` and `AI_CLIENT="fake"`, with `restoreMocks` and `unstubEnvs` on. It runs two projects: `node` for `*.test.ts`, whose setup file migrates the in-memory DB, and `dom` for `*.test.tsx`, which uses jsdom and `@testing-library/jest-dom/vitest`. `src/test/db.ts` exports `createTestDb()`, which returns a freshly migrated in-memory database. The DB module refuses to open any `file:` URL while `VITEST` is set and throws `Refusing to open <url> under Vitest`, so the guard holds even when a test forgets the helper. `history-store.test.ts` runs against the test DB. Its `{"score": 5}` fixture stays as plain data until T04 turns it into a deliberate malformed-row test.

**Generated migrations.** The app moves from `drizzle-kit push` to versioned migrations in `drizzle/`, which are committed:

- `0000_baseline.sql` is generated from the current `schema.ts`, then hand-edited to `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so the existing push-created `data.db` accepts it without losing rows.
- `scripts/migrate.ts` copies `data.db` to `data.db.bak-<timestamp>` only when the file exists *and* migrations are pending, then runs the libsql migrator. It runs as `predev` and `prestart`. Tests call the same migrate function.
- Scripts: `db:generate`, `db:migrate`, `db:studio`. `db:push` is removed.
- `docs/adr/0001-generated-migrations.md` records the decision.

## Acceptance criteria

- [ ] `[check]` `sha256sum data.db` prints the same hash before and after `npm test`.
- [ ] `[check]` With `data.db` moved aside, `npm test` passes and does not create a new `data.db`.
- [ ] `[unit]` Opening the DB module under Vitest with `DATABASE_URL=file:./data.db` throws an error naming the URL.
- [ ] `[integration]` Two test files that both write sessions do not see each other's rows.
- [ ] `[integration]` A DB built the way `push` built it, holding a copy of session 35 (`{"score": 5}`), accepts the baseline migration. Session 35 is unchanged afterwards, and `__drizzle_migrations` records the baseline.
- [ ] `[integration]` The migrate script writes exactly one `.bak-` copy when migrations are pending, and none when the DB is already up to date or doesn't exist.
- [ ] `[unit]` A trivial `.test.tsx` renders a component in jsdom and passes a jest-dom matcher (`toBeInTheDocument`).
- [ ] `[check]` `cp data.db /tmp/fwp.db && DATABASE_URL=file:/tmp/fwp.db npm run db:migrate` succeeds, and `sqlite3 /tmp/fwp.db "select evaluation_json from sessions where id = 35"` still prints `{"score": 5}`.
- [ ] `[check]` `package.json` has no `db:push` script; `drizzle/` and the ADR are committed.

## Tests to write first

1. Opening a `file:` URL under Vitest throws.
2. Rows written in one test file are invisible to another.
3. The baseline migration applies to a push-created DB and keeps session 35 unchanged.
4. Migrating backs up only when migrations are pending.
5. A jsdom component render passes a jest-dom matcher.

## Out of scope

- Backfills and new columns such as `status` and `local_date` (T13, T17).
- Moving stores to `src/server/repositories` with an injected `db` (not ticketed yet; P1 in tooling review).
- Treating malformed `evaluation_json` as a readable state (T04).
- The ast-grep ban on importing `@/db` in tests (T07).

## References

- `docs/agents/tooling-review.md` §6 "Test DB isolation" and §12 TOOL-1.
- `docs/plan/backend-requirements.md` §0 D9, §2.1, §2.3, §5 "D9: test DB isolation", §7 S0 and S1.
