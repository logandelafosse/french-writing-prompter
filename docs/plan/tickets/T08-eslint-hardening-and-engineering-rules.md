# T08 — ESLint hardening and AGENTS.md engineering rules

GitHub issue: #10

| Phase | Type | Blocked by | Production lines (est.)            |
| ----- | ---- | ---------- | ---------------------------------- |
| 0     | AFK  | T05, T07   | ~150 config + ~150 violation fixes |

## User stories

- As an agent implementing a ticket, I want floating promises, non-exhaustive switches, unlabeled controls, seam-crossing imports, and silenced rules to fail `npm run lint`, so that reviewers spend their time on design instead of mechanical defects.
- As an agent starting a ticket, I want `AGENTS.md` to state the engineering rules and point me at the delivery workflow and board, so that I know the rules before I write code rather than learning them from review.
- As Logan as maintainer, I want every `eslint-disable` to carry a reason, so that suppressions are visible decisions, not escapes.

## What to build

`eslint.config.mjs` follows the sketch in `tooling-review.md` §3.2, verified against the installed plugin APIs:

- `typescript-eslint` `strictTypeChecked` on `src/**` with `projectService`; `no-confusing-void-expression` off; `restrict-template-expressions` with `allowNumber`.
- `switch-exhaustiveness-check` with `considerDefaultExhaustiveForUnions: false` and `requireDefaultForNonUnion: true`.
- `jsx-a11y` strict rules (spread only `.rules`; Next already registers the plugin).
- `react/no-unescaped-entities` forbidding only `>` and `}`, so French apostrophes are allowed.
- Module seams via `@typescript-eslint/no-restricted-imports` per §3.3. Components and pages can't import `@/db`, `@/server`, stores or `openai`. `src/modules` can't import Next, React, `@/db` or `openai`, except `src/modules/openai-client`. Each seam has its own message.
- `@eslint-community/eslint-plugin-eslint-comments` with `require-description` and `no-unlimited-disable`, plus `reportUnusedDisableDirectives: "error"`.
- `@vitest/eslint-plugin` on tests (`no-focused-tests`, `no-disabled-tests`, `expect-expect`, `no-conditional-expect`, …).
- `eslint-plugin-testing-library` and `eslint-plugin-jest-dom` on `*.test.tsx`.
- `lint` runs with `--max-warnings=0`.

Remaining violations outside `src/components/legacy/` get fixed properly (narrow, parse, or `void` with an error branch; no new casts). Legacy is exempt from `jsx-a11y`. If fixing type-aware rules inside legacy code pushes `pr:size` over budget, extend the legacy override with those specific rules instead of fixing code the redesign will delete. The existing file-wide disable in `writing-evaluator.test.ts` either goes away or is narrowed and given a reason.

The P1 rules (`no-magic-numbers`, `react/jsx-no-leaked-render`, `import/no-cycle`; §11 row 13) are in scope only if the budget allows. Otherwise, note them on the board card.

`AGENTS.md` keeps its existing sections. It gains the `## Engineering rules` block from §13 verbatim, with paths updated to match what T04–T07 actually created, and a short pointer to `docs/agents/workflow.md` (delivery loop) and `docs/plan/board.md` (what to work on). `CLAUDE.md` stays `@AGENTS.md`; no rules are copied into `.cursor/rules/`.

## Acceptance criteria

- [ ] `[check]` `npm run lint` (with `--max-warnings=0`) and `npm run check` exit 0.
- [ ] `[check]` A scratch component in `src/components/home/` importing `@/db` fails with the seam message; a scratch file in `src/modules/` importing `react` fails; `import OpenAI from "openai"` outside `src/modules/openai-client` fails.
- [ ] `[check]` `// eslint-disable-next-line some-rule` without `-- reason` fails; an unused disable directive fails.
- [ ] `[check]` A `switch` over a union that has a `default:` but misses a member fails `switch-exhaustiveness-check`.
- [ ] `[check]` `onClick={async () => { await save(); }}` in a non-legacy component fails `no-misused-promises`; an un-awaited promise call fails `no-floating-promises`.
- [ ] `[check]` `it.only(...)` and a test with no assertion fail; `container.querySelector` in a `.test.tsx` fails.
- [ ] `[check]` `<div onClick={…}>` outside `legacy/` fails `jsx-a11y`; JSX text `C'est d'accord` passes; `a > b` as JSX text fails.
- [ ] `[check]` `AGENTS.md` contains `## Engineering rules` matching §13 and links to `docs/agents/workflow.md` and `docs/plan/board.md`; the Issue tracker / Triage labels / Domain docs sections are unchanged.

## Tests to write first

A Vitest test (`src/test/lint/eslint-config.test.ts`) uses ESLint's Node API to lint small snippets at a given `filePath` and asserts the expected rule ID fires. One case per criterion above: seam import from components, React import from modules, disable without reason, non-exhaustive switch, misused promise, focused test, clickable `div`, French apostrophe allowed. If type-aware rules can't run on virtual paths, lint committed fixture files under `src/test/lint-fixtures/` with `ignore: false`. Exclude those fixtures from the normal lint run and from `typecheck` only if they must contain type errors (they shouldn't).

## Out of scope

- `eslint-plugin-playwright` and `e2e/**` config (T11).
- ast-grep rules (T07); don't encode the same ban in both tools (§ guiding rule).
- Pre-commit hooks and `opencode.json` `--no-verify` deny (T12).
- Moving stores into `src/server/repositories` (P1 refactor, not on the board).

## References

- `docs/agents/tooling-review.md` §1 (probe counts), §3.1–3.3 (rules, config sketch, seams), §10 (AGENTS.md as single source), §11 row 13, §12 TOOL-8, §13 (rules block).
- `docs/agents/workflow.md` (what the AGENTS.md pointer links to).
