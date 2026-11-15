# T02 — Baseline green: TS flags, `check`, `pr:size`, CI

| Phase | Type | Blocked by | Production lines (est.) |
|---|---|---|---|
| 0 | AFK | T01 | ~120 |

## User stories

- As an agent implementing a ticket, I want one command, `npm run check`, that tells me whether my branch is mergeable, so that I don't guess which checks matter.
- As an agent implementing a ticket, I want `npm run pr:size` to print my production line count, so that the 500-line budget is a number, not an argument.
- As Logan, I want empty query results to fail with a clear error instead of `Cannot read properties of undefined`, so that quota and level bugs surface where they happen.

## What to build

**Compiler.** Apply the `tsconfig.json` delta from tooling review §2: `target: ES2022`, `allowJs: false`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noImplicitOverride`, `verbatimModuleSyntax`. Fix the 24 `noUncheckedIndexedAccess` errors in `quota-store.ts`, `history-store.ts`, `placement-test.ts`, `cefr-tracker*` and tests. Use drizzle's `.get()` (returns `T | undefined`) or a `first(rows, context)` helper that throws with context, never `!`.

**Lint.** Configure `react/no-unescaped-entities` with `forbid: [">", "}"]` so French apostrophes (`C'est`, `d'écriture`) are allowed. This clears the 3 current errors without touching the components. `lint` runs with `--max-warnings=0`.

**Scripts.**

- `typecheck`: `tsc --noEmit`.
- `check`: `typecheck && lint && test`. Later tickets append `format:check` (T03), `knip` (T06) and `lint:ast` (T07).
- `pr:size`: counts **added lines in production files** between the merge-base with `origin/main` and `HEAD`. It prints the total and the files counted, and exits non-zero at 500 or more. Excluded paths:
  - tests: `**/*.test.*`, `src/test/**`, `e2e/**`
  - fixtures: `**/fixtures/**`, `**/__fixtures__/**`, `tooling/ast-grep/tests/**`
  - docs: `docs/**`, `*.md`
  - generated: `drizzle/**`, `next-env.d.ts`, `src/data/**`
  - lockfiles: `package-lock.json`

  Config files (`*.config.*`, `.github/**`, `tooling/ast-grep/rules/**`) count as production. Path classification is a pure function with unit tests, so the exclusion list is reviewable.

**CI.** `.github/workflows/check.yml` runs on `pull_request`: checkout with full history, `npm ci`, `npm run check`, then `npm run pr:size`. The size step is skipped when the PR has the `size-exempt` label. Only the coordinator applies that label, for format-only PRs like T03.

## Acceptance criteria

- [ ] `[check]` `npm run typecheck` exits 0 with every flag above set in `tsconfig.json`.
- [ ] `[check]` `npm run lint` exits 0, and a scratch JSX text `C'est l'heure` produces no lint error.
- [ ] `[check]` `npm run check` exits 0 locally.
- [ ] `[check]` The `check` workflow passes on this ticket's PR, and fails on a scratch PR that adds a type error.
- [ ] `[check]` `rg -n '\]!\.' src --glob '!**/*.test.*'` finds no non-null assertions introduced to silence the new flags.
- [ ] `[unit]` Path classification counts `src/app/page.tsx`, `eslint.config.mjs` and `.github/workflows/check.yml` as production, and excludes every path pattern listed above.
- [ ] `[integration]` On a scratch branch adding 499 production lines plus 1,000 test lines, `pr:size` exits 0. At 500 production lines it exits non-zero.
- [ ] `[unit]` A store read that finds no row throws an error naming the missing record, rather than a `TypeError`.

## Tests to write first

1. Path classification: production versus excluded, with a table of paths.
2. `pr:size` totals and exit code at the 499/500 boundary, against a temp git repo.
3. A store read on an empty table throws a named error.

## Out of scope

- Prettier and `format:check` (T03).
- `typescript-eslint` strict-type-checked, seams and a11y rules (T08).
- The Playwright CI job (T11).
- `TZ` pinning in the `test` script (T06).

## References

- `docs/agents/tooling-review.md` §1 baseline results, §2, §3.1 (`react/no-unescaped-entities` row), §6 scripts, §7 CI paragraph, §12 TOOL-2.
- `docs/agents/workflow.md` ticket loop step 3 (size gate).
