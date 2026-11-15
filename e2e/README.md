# End-to-end tests

## Layout

- One spec file per screen: `home.spec.ts`, `carnet.spec.ts`, `historique.spec.ts`, `placement.spec.ts`.
- Shared helpers live in `e2e/support/` (`fixtures.ts`, `axe.ts`, `evidence.ts`).

## Conventions

- Test titles describe learner behaviour, not implementation.
- Every test runs on both `desktop` (1280×800) and `mobile` (390×844) unless tagged `@desktop` / `@mobile`.
- Server-side AI calls use the `x-e2e-scenario` header with `AI_CLIENT=fake` (`happy`, `malformed`, `failure`). Add fixtures under `src/test/fixtures/ai/` and a scenario name; do not add parallel mocking mechanisms.
- Use `page.route()` only for client-visible network failures (offline, HTTP 500).
- Locators: `getByRole`, `getByLabel`, `getByText` only. No sleeps.
- Call `expectNoAxeViolations` for each new screen state. Legacy Home/History may pass explicit disabled rule IDs with reasons until the redesign lands.
- PR evidence: `E2E_EVIDENCE=<ticket ID> npm run test:e2e` writes `docs/evidence/<ticket ID>/<project>-NN-<name>.png` (CSS scale). Embed in the PR per the `pr-ui-evidence` skill.
