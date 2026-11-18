# T36 — Remote libsql client, file URL refused on Vercel

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
