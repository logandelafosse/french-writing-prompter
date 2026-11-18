# T38 — Function duration covers the OpenAI client

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 5     | AFK  | —          | ~40                     |

**User stories**

- As Logan, I want an Evaluation that runs for the client's full timeout to finish inside the function, so that a slow `gpt-4o` response comes back as the app's JSON error (or the real Evaluation) rather than an HTML platform page.

**What to build**

`OpenAiClient` uses `timeout: 30000` and `maxRetries: 2`, so one call can last about 90s. Add `AI_ROUTE_MAX_DURATION` in `src/config/ai.ts` (next to `AI_MODEL`) at 120 seconds. Export `maxDuration` from each route module whose handler can wait on that client:

- `src/app/api/prompt/route.ts`
- `src/app/api/sessions/[id]/evaluate/route.ts`
- `src/app/api/placement/start/route.ts`
- `src/app/api/placement/[runId]/submit/route.ts`

`getAiClient()` lives in `placementService()` in `src/app/api/placement/route.ts`. Start and submit import that helper and are the handlers that call `start()` / `submit()` (generator and evaluator). `GET` on `placement/route.ts` only calls `getCurrent()` and does not wait on the model, so that module does not export `maxDuration`. There is no `src/app/api/evaluate/route.ts` and no `src/app/api/placement/route.ts` POST.

Next may require the exported `maxDuration` to be statically analyzable. If an imported constant is dropped at build, repeat the numeric literal in each route and add a unit test that those literals equal `AI_ROUTE_MAX_DURATION`. One source of the number either way.

**Acceptance criteria**

- [ ] `[unit]` `AI_ROUTE_MAX_DURATION` is greater than or equal to `(timeoutMs / 1000) * (maxRetries + 1)` for the values in `OpenAiClient` (30 × 3 = 90), and the exported value is 120.
- [ ] `[check]` Each of these route modules exports `maxDuration` equal to that constant: `src/app/api/prompt/route.ts`, `src/app/api/sessions/[id]/evaluate/route.ts`, `src/app/api/placement/start/route.ts`, `src/app/api/placement/[runId]/submit/route.ts`.
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
