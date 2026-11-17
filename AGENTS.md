## Agent skills

### Domain vocabulary (read first)

**`CONTEXT.md`** at the repo root is the glossary. Use its terms; never the _Avoid_ words. **Module homes** in that file maps each term to its owning Seam under `src/modules/`. How to consume domain docs: `docs/agents/domain.md`.

### Issue tracker

GitHub Issues (gh CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels — no overrides. See `docs/agents/triage-labels.md`.

## Engineering rules

### Workflow

- Run `npm run check` before every commit. Never use `--no-verify`. CI runs the same command.
- One ticket = one PR. `npm run pr:size` must stay under 500 production lines (tests/fixtures excluded).
- TDD, tracer-bullet first: the first failing test hits the outermost seam that exists for the behavior (route handler, component, or e2e spec), not an inner helper. Then go inward.
- If a lint/ast-grep rule is wrong, fix the rule in its own PR. Suppressions need `-- reason` (ESLint) or a reason after `ast-grep-ignore`; reviewers reject unexplained ones.
- Delete the code you replace in the same PR. No commented-out code. `knip` must pass.

### Single source of truth

- Domain words come from `CONTEXT.md`; UI strings come from the HANDOFF copy table and live in `src/copy/fr.ts`. Never use the "Avoid" words.
- Types for anything crossing a boundary are `z.infer` of a schema in `src/contracts`. Never declare a parallel interface or union.
- Louisiana French rules: only `src/modules/dialect`. Limits/model names: only `src/config`. Colors/fonts/radii: only `src/styles/tokens.css`. Before adding a constant, `rg` for an existing one.

### Boundaries (crash early, in one place)

- Every value entering the process is parsed: request bodies (`parseRequestBody`), fetch responses (`fetchJson`), LLM output (`chatCompletionJSON(Schema)`), DB JSON/text enums (repositories), env (`getEnv()`), localStorage drafts.
- No `as` (except `as const`), no `!`, no `any` in production code. Narrow or parse instead.
- A parse failure in a list item renders an inline notice for that item; it never blanks the page.

### Time

- Calendar days are local: `localDateKey()` from `src/lib/dates.ts`. Never slice `toISOString()`.
- Code that depends on "now" takes a `now: () => Date` parameter so tests control it.

### UI state

- Each async surface has one discriminated-union state (`idle | generating | evaluating | error`). No shared `loading` booleans. Each action has its own label.
- Every error/banner state has a test proving it clears on the next relevant action.

### Accessibility (HANDOFF is the contract)

- Use `src/components/ui` primitives; never raw `<button>/<input>/<textarea>/<select>` elsewhere.
- Every control has an associated `<label>` or `aria-label`. Results arrive in an `aria-live="polite"` region and receive focus. Errors use `role="alert"`. `lang="fr"` on French text.

### Tests

- Never touch `data.db`. Unit/integration tests use `createTestDb()`; e2e uses its own DB file.
- Inject fakes through constructors/factories (`OpenAiClientLike`, `getAiClient()`); don't `vi.mock` our own modules.
- Query by role/label (Testing Library, Playwright). No snapshot tests. No `.only`/`.skip` in commits.
- AI fixtures live in `src/test/fixtures/ai/` and are validated by the same schemas as production.

### Module seams

Prefer **deep modules**: a small **Interface** (what callers must know) hiding a large **Implementation**, at a clear **Seam**. **Depth** = leverage per unit of Interface. **Locality** = change and tests concentrate behind that Seam. An **Adapter** fills a Seam; one Adapter is a hypothetical Seam — don’t invent ports until a second Adapter exists. Deletion test: if deleting the module only moves complexity into callers, it was earning its keep.

- Domain words and term→module map: **`CONTEXT.md`**. Deepening tickets: `docs/plan/deepenings.md` (D01–D05).
- Components → `@/contracts`, `@/copy`, `@/lib/http`, `@/components/ui` only. Never `@/db`, `@/server`, stores, or `openai`.
- `src/modules` is framework-free (no `next`, `react`). Persistence Adapters under `src/modules/**` may use `@/db`; only `src/modules/openai-client` imports `openai`. Route handlers must not import `@/db`.
- Route handlers stay thin: parse → call module → persist via repository → respond.

## Delivery

- Workflow (coordinator, implementers, reviewers, definition of done): `docs/agents/workflow.md`
- Plan and open owner questions: `docs/plan/plan.md`
- Module deepenings (post–T35): `docs/plan/deepenings.md` · tickets `D01`–`D05` in `docs/plan/tickets/`
- Board (source of truth for ticket status and why): `docs/plan/board.md`
- Ticket specs: `docs/plan/tickets/`
- UI spec: `docs/design/handoff/HANDOFF.md`, mapped onto the code in `docs/design/implementation-map.md`
- Tooling recommendations: `docs/agents/tooling-review.md`
