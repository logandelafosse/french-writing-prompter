# ADR 0001: Generated migrations instead of drizzle-kit push

## Status

Accepted (T01).

## Context

The app stores learner Student Writing in SQLite (`data.db`). Schema changes were applied with `drizzle-kit push`, which is interactive, hard to review, and not reproducible for tests. Tests accidentally targeted the real database file and deleted learner data.

## Decision

- Versioned SQL migrations live in `drizzle/` and are committed.
- `0000_baseline.sql` uses `CREATE TABLE IF NOT EXISTS` so existing push-created databases accept the baseline without data loss.
- `scripts/migrate.ts` (via `npm run db:migrate`, `predev`, and `prestart`) backs up `data.db` to `data.db.bak-<timestamp>` only when the file exists and migrations are pending, then runs the Drizzle libsql migrator.
- Tests and `createTestDb()` use the same migrator against `:memory:` databases.

## Consequences

- Schema changes require `npm run db:generate`, hand-review of SQL, and a PR that includes migration files.
- `db:push` is removed from package scripts.
- CI and agents can build an isolated DB from `drizzle/` without touching `data.db`.
