# T40 — Project, secrets, protection, import

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
