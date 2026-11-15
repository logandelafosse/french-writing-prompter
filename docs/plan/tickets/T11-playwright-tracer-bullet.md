# T11 — Playwright tracer bullet with fake AI client and axe

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 0 | AFK | T05 | ~200 in `src` and config (e2e specs, helpers and fixtures excluded) |

## User stories

- As an agent implementing a UI ticket, I want a working Playwright harness with a fake AI client and named scenarios, so that I can prove learner-visible behaviour at 1280 px and 390 px without OpenAI or a hand-rolled setup.
- As Logan as maintainer, I want CI to run the end-to-end suite with an axe check against its own database, so that a broken flow or an accessibility regression blocks the PR, and my `data.db` is never touched.

## What to build

**Fake AI client on the server.** OpenAI is called from route handlers, so `page.route()` can't intercept it. `src/server/ai-client.ts` exposes `getAiClient(scenario)`, which returns the real client by default and a `FakeAiClient` when `getEnv().AI_CLIENT === "fake"`. Routes that call the AI read the scenario from the `x-e2e-scenario` request header. The header is ignored unless `AI_CLIENT=fake`.

The scenarios are:

- `happy` (default): valid fixtures.
- `malformed`: output that fails the zod contract, so the route returns the T04 `AiOutputError` 502.
- `failure`: the client throws.

Fixtures live in `src/test/fixtures/ai/`, and a unit test parses each one with its production schema. The real `OpenAiClient`/`new OpenAI` is constructed only in `ai-client.ts` and `src/modules/openai-client/`. If T07 has merged, add the §4 P1 rule `no-direct-ai-client` to enforce that.

**E2E database.** `webServer` runs `next build && next start -p 3100` with `DATABASE_URL=file:./.e2e/e2e.db AI_CLIENT=fake`. `globalSetup` deletes `.e2e/e2e.db`, migrates a fresh one, and refuses to run if the resolved URL is not under `.e2e/`. A `resetDb` fixture truncates the tables before each test. `workers: 1`. `.e2e/`, `playwright-report/` and `test-results/` are gitignored, if T00 didn't already ignore them.

**Harness.** `playwright.config.ts` has `desktop` (1280×800) and `mobile` (390×844) projects. Shared helpers in `e2e/support/`:

- `test` extended with `resetDb` and `scenario(name)`, which sets the header through `page.setExtraHTTPHeaders`.
- `expectNoAxeViolations(page)` using `@axe-core/playwright`. It accepts a list of disabled rule IDs, each with a reason. This is how the legacy UI's known violations get recorded until the redesign replaces those screens; new screens pass an empty list.
- `captureEvidence(page, name)`: a no-op unless `E2E_EVIDENCE=<ticket ID>` is set.

`eslint-plugin-playwright` (`no-raw-locators`, `prefer-web-first-assertions`, `no-wait-for-timeout`, `no-networkidle`, `no-force-option`) applies to `e2e/**`.

`npm run test:e2e` runs `playwright test`. CI gets a second job after `check`: `npx playwright install --with-deps chromium && npm run test:e2e`.

**Tracer spec.** `e2e/home.spec.ts` drives today's (legacy) flow on both projects: pick a level, generate a prompt, write, submit, see the Evaluation, then open History and see the session. It runs an axe check on Home and History. A `malformed` case shows the error the current UI renders, and retrying under `happy` recovers.

**Conventions for later specs**, written to `e2e/README.md`:

- One spec file per screen (`home.spec.ts`, `carnet.spec.ts`, `historique.spec.ts`, `placement.spec.ts`). Tickets extend these specs instead of adding harnesses.
- Test titles describe learner behaviour.
- Every test runs on both projects unless the behaviour is viewport-specific (tag `@desktop`/`@mobile`).
- New AI behaviours add a fixture plus a scenario name, never a new mechanism. Use `page.route()` only for client-visible network failures (offline, HTTP 500).
- Locators come only from `getByRole`, `getByLabel` and `getByText`. There are no sleeps.
- Each new screen state gets an axe call.
- For PR evidence, run `E2E_EVIDENCE=T13 npm run test:e2e`. `captureEvidence` writes `docs/evidence/<ticket ID>/<project>-NN-<name>.png` at CSS scale, and the PR embeds the images per the `pr-ui-evidence` skill.

## Acceptance criteria

- [ ] `[e2e]` `npm run test:e2e` passes locally and in CI on both `desktop` and `mobile`, with `OPENAI_API_KEY` unset and no network access to OpenAI.
- [ ] `[e2e]` The tracer spec shows the generated prompt from the `happy` fixture, the Evaluation after submit, and the session in History.
- [ ] `[e2e]` The `malformed` scenario shows the current UI's error message without a Next error overlay; switching to `happy` and retrying succeeds.
- [ ] `[e2e]` axe reports no violations on Home and History beyond the explicitly listed legacy rule IDs, each of which has a reason.
- [ ] `[unit]` Every fixture in `src/test/fixtures/ai/` parses with its production schema.
- [ ] `[unit]` `getAiClient` returns the fake only when `AI_CLIENT=fake`; the scenario header is ignored when `AI_CLIENT=openai`.
- [ ] `[check]` `sha256sum data.db` is identical before and after `npm run test:e2e`; `globalSetup` throws if `DATABASE_URL` points outside `.e2e/`.
- [ ] `[check]` `page.locator(".foo")` or `page.waitForTimeout(500)` in a scratch spec fails `npm run lint`.
- [ ] `[check]` `E2E_EVIDENCE=T11 npm run test:e2e` writes PNGs under `docs/evidence/T11/`; without the variable, nothing is written.

## Tests to write first

- `src/server/ai-client.test.ts`: "returns the fake client when AI_CLIENT=fake", "ignores the scenario header unless AI_CLIENT=fake", "malformed scenario produces output the contract rejects".
- `src/test/fixtures/ai/fixtures.test.ts`: "every AI fixture satisfies its schema" (extend T04's test if one exists).
- `e2e/home.spec.ts`: "learner generates a prompt, writes, and sees the Evaluation and the History entry"; "malformed AI output shows an error and retry recovers". Write the spec first and watch it fail on the missing harness.

## Out of scope

- Redesigned screens and their specs (T13 onward extend `home.spec.ts`).
- The `slow` scenario for busy labels (add it with the first ticket that asserts a busy label, T16).
- Offline and HTTP-500 `page.route()` cases (T19).
- Lefthook (T12).

## References

- `docs/agents/tooling-review.md` §5 (env `AI_CLIENT`, fixtures validated by contracts), §7 (CI job), §8 (Playwright conventions), §4 P1 `no-direct-ai-client`, §12 TOOL-10.
- `docs/agents/workflow.md` step 5 (Playwright gate).
- `~/.cursor/skills/pr-ui-evidence/SKILL.md` (evidence storage and embedding).
- `docs/design/handoff/HANDOFF.md` "Accessibility" (what axe enforces).
