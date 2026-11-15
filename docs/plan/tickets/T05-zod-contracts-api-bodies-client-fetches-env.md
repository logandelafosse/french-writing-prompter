# T05 — Zod contracts for API bodies, client fetches, env

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 0     | AFK  | T04        | ~300                    |

## User stories

- As Logan, I want a missing OpenAI key to fail at startup with a message naming the variable, so that I don't discover it as a vague "AI service error" after writing 300 words.
- As Logan, I want a failed request to show a readable error in the page instead of a broken screen, so that I can retry.
- As an agent implementing a ticket, I want every request body, response and env variable parsed by a schema from `src/contracts`, so that `any` never flows from the network into state.

## What to build

**Request bodies.** `src/lib/http/` exports `parseRequestBody(request, Schema)`, which returns a Result. On failure it returns a ready-made 400 JSON response whose message is `z.prettifyError` output. Request schemas are `z.strictObject` and live in `src/contracts`. They are applied to every route that reads a body: `POST /api/evaluate`, `PUT /api/level`, `POST /api/placement`. `PUT /api/level` accepts `{ level }` only. The server records the change as `manual`, so a client can no longer claim `source: "auto"`.

**Client fetches.** `fetchJson(url, Schema, init?)` returns `Result<T, FetchError>`, where:

```ts
type FetchError =
  | { kind: "network" }
  | { kind: "http"; status: number; message: string }
  | { kind: "invalid" };
```

Response schemas for all six routes live in `src/contracts`. Every client fetch in `level-card`, `prompt-card`, `placement-test-card` and `history-page` goes through `fetchJson`. Each failure kind leaves the component in a visible error state; no promise rejection escapes. The existing UI copy is kept; the redesigned error states come later.

**Env.** `src/server/env.ts` exports `getEnv()`. It is lazy, so `next build` needs no secrets, and memoized. The schema covers:

- `OPENAI_API_KEY`, required unless `AI_CLIENT=fake`
- `DATABASE_URL`, defaulting to `file:./data.db`
- `AI_CLIENT`: `openai | fake`, defaulting to `openai`
- `VITEST`, optional

A failure throws `EnvError`, which names each bad variable. The DB module and the OpenAI client read config only through `getEnv()`. The `"sk-placeholder"` fallback is deleted, and T01's Vitest guard keeps working through `getEnv()`.

## Acceptance criteria

- [ ] `[integration]` For each of `POST /api/evaluate`, `PUT /api/level`, `POST /api/placement`, a bad body (wrong type, missing field, extra field) gets 400 with a message naming the field, and nothing is written to the test DB.
- [ ] `[integration]` `PUT /api/level` with `{ level: "B1", source: "auto" }` gets 400. With `{ level: "B1" }`, it records a `manual` change.
- [ ] `[unit]` `fetchJson` returns `network` when fetch rejects, `http` with status and server message on a 4xx/5xx, `invalid` when the body fails the schema, and the parsed value otherwise.
- [ ] `[integration]` The level card, given a fetch that returns `{ level: "Z9" }`, renders an error message instead of throwing.
- [ ] `[unit]` `getEnv()` without `OPENAI_API_KEY` and with `AI_CLIENT` unset throws `EnvError` mentioning `OPENAI_API_KEY`. With `AI_CLIENT=fake`, it succeeds.
- [ ] `[check]` `env -u OPENAI_API_KEY npm run build` succeeds.
- [ ] `[check]` `rg -n '\.json\(\)' src --glob '!**/*.test.*'` matches only `src/lib/http/`; `rg -n 'process\.env' src --glob '!**/*.test.*'` matches only `src/server/env.ts`; `rg -n 'sk-placeholder' src` matches nothing.
- [ ] `[check]` `npm run check` exits 0.

## Tests to write first

1. Each body-reading route rejects a malformed body with a 400 that names the field.
2. The level route ignores client-claimed `auto` and records `manual`.
3. `fetchJson` maps each failure kind.
4. A component renders an error state when its fetch returns an invalid body.
5. `getEnv()` fails fast on a missing key, unless the fake client is selected.

## Out of scope

- `getAiClient()`, `FakeAiClient` and the scenario header (T11). This ticket only adds `AI_CLIENT` to the env schema.
- Redesigned error and offline states with `role="alert"` (T19).
- A shared `withErrors` wrapper for every route (T19, T21 as needed).
- `APP_TIME_ZONE` and local-midnight quota (T13).
- The ast-grep `no-raw-json-body` and `no-process-env` rules (T07). Strict `no-unsafe-*` lint (T08).

## References

- `docs/agents/tooling-review.md` §5 (API bodies, client fetches, environment rows) and §12 TOOL-5.
- `docs/plan/backend-requirements.md` §0 D10, §3 API contracts, §5 D10 row.
