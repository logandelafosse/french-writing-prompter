# Agent tooling review

Date: 2026-11-14. Scope: repo tooling that makes AI agents implementing the redesign (`docs/design/handoff/HANDOFF.md`) write correct, consistent code, and lets adversarial reviewers spend their time on design instead of on mechanical defects.

Guiding rule: **every known defect gets a machine check, and each check lives in exactly one tool.**

| Kind of check                         | Tool                           |
| ------------------------------------- | ------------------------------ |
| Needs type information                | `typescript-eslint`            |
| Import graph and module seams         | ESLint `no-restricted-imports` |
| Syntactic bans with long explanations | ast-grep                       |
| Dead code and dependencies            | knip                           |
| Shape of data at runtime              | Zod                            |
| Behavior                              | Vitest and Playwright          |

Don't encode the same ban in two tools; that is DRY applied to tooling.

---

## 1. Current state

### Tooling inventory

| Area                                                 | State                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Git                                                  | **The project is not under version control.** `git rev-parse --show-toplevel` resolves to `~/Personal-Projects` (remote `sekaieth/Personal-Projects`). There, `french-writing-prompter/` shows as untracked (`?? french-writing-prompter/`) and has no `.git` of its own. You can't open PRs, hooks would install into the shared parent repo, and `gh issue` would target the wrong repo. |
| `.gitignore`                                         | Next.js default. **`data.db` is not ignored**, and it holds personal writing. `.env*` is ignored.                                                                                                                                                                                                                                                                                          |
| Scripts                                              | `dev`, `build`, `start`, `lint` (`eslint`), `test` (`vitest run`), `test:watch`, `db:push`, `db:studio`. No `typecheck`, no `check`, no e2e.                                                                                                                                                                                                                                               |
| TypeScript                                           | 5.9.3. `strict: true`, `target: ES2017`, `allowJs: true`, `isolatedModules`, `moduleResolution: bundler`. No extra strictness flags.                                                                                                                                                                                                                                                       |
| ESLint                                               | 9, flat config. Only `eslint-config-next` `core-web-vitals` and `typescript`. No type-aware rules.                                                                                                                                                                                                                                                                                         |
| Vitest                                               | 4.1. `environment: "node"`, `globals: true`, alias `@`. No jsdom project even though Testing Library and jsdom are installed. No setup file. No env isolation: `src/db/index.ts` falls back to `file:./data.db`.                                                                                                                                                                           |
| Formatter                                            | None (no Prettier or Biome).                                                                                                                                                                                                                                                                                                                                                               |
| ast-grep / knip / Playwright / lefthook / husky / CI | None. **On this machine `/usr/bin/sg` is shadow-utils, not ast-grep.** Always invoke `ast-grep`, never `sg`.                                                                                                                                                                                                                                                                               |
| Drizzle                                              | `drizzle-kit push` only. **No `drizzle/` migrations folder**, so a test DB can't be built from versioned schema.                                                                                                                                                                                                                                                                           |
| Zod                                                  | 4.4.3 is in `node_modules`, but only transitively (through `eslint-plugin-react-hooks`). It is not a direct dependency.                                                                                                                                                                                                                                                                    |
| Agent configs                                        | `.cursor/` and `.claude/` are empty. `CLAUDE.md` contains `@AGENTS.md`. `AGENTS.md` only points at the issue tracker, labels and domain docs. `opencode.json` is `{"permission": "allow"}`, so everything is allowed, including force-push and `--no-verify`.                                                                                                                              |
| `docs/plan/tickets/`                                 | Empty.                                                                                                                                                                                                                                                                                                                                                                                     |

### Baseline results

| Command            | Result                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit` | **Exit 0** with `--incremental false`. The default run failed only because the sandbox couldn't write `tsconfig.tsbuildinfo` (EROFS), which is not a code issue.                                                                                                         |
| `npm run lint`     | **Exit 1, 3 errors**, all `react/no-unescaped-entities` on English apostrophes: `placement-test-card.tsx:202`, `prompt-card.tsx:155`, `prompt-card.tsx:245`. The redesign's French copy (`C'est`, `d'écriture`, `Donne-moi`…) would trip this rule constantly; see §3.2. |
| `npx vitest run`   | **Not run on purpose.** `history-store.test.ts` calls `db.delete(sessions)` against the real `data.db`. That makes `npm test` a destructive command today, which is the most urgent broken window.                                                                       |

Probes (temporary flags and a `/tmp` ESLint config; no repo files changed):

| Probe                                                                                       | New errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--noUncheckedIndexedAccess`                                                                | 24, across `quota-store.ts` (6), `history-store.ts` (3), `placement-test.ts` (3), `cefr-tracker*` (6) and tests (5). Mostly `rows[0].x`, which crashes on empty result sets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `--exactOptionalPropertyTypes`                                                              | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--noImplicitOverride`                                                                      | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--noFallthroughCasesInSwitch`                                                              | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--noImplicitReturns`                                                                       | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--verbatimModuleSyntax`                                                                    | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--noPropertyAccessFromIndexSignature`                                                      | 3, all `process.env.X`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `--erasableSyntaxOnly`                                                                      | 5 (constructor parameter properties)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `typescript-eslint` `strictTypeChecked` + `switch-exhaustiveness-check` + `jsx-a11y` strict | **155** in total: `no-unsafe-member-access` 40, `no-unsafe-assignment` 32, `no-unsafe-argument` 25, `no-unnecessary-type-assertion` 14, `no-non-null-assertion` 11, `no-misused-promises` 9, `no-confusing-void-expression` 6, `no-floating-promises` 5, `no-unsafe-call` 3, `restrict-template-expressions` 2, `no-unnecessary-condition` 2, `await-thenable` 1, `require-await` 1, `jsx-a11y/label-has-associated-control` 2, `jsx-a11y/click-events-have-key-events` 1, `jsx-a11y/no-static-element-interactions` 1. **About 100 of the 155 are `no-unsafe-*` hits that trace back to untyped `res.json()` and `request.json()`.** Validating at the boundaries (§5) removes most of them. |

### Problems found beyond the brief

These confirm the pattern behind the known list:

- `CefrLevel` is declared twice: `modules/cefr-tracker/cefr-tracker.ts:1` and `components/level/level-components.tsx:5`.
- The `Evaluation` JSON shape is written twice: as TS interfaces and again as prose inside the evaluator's system prompt.
- `"gpt-4o"` appears twice, `"louisiana"` appears as a literal in 3 routes plus the history page, and the quota `3` appears in `QuotaManager`, `api/prompt`, `api/quota` and the copy string "You've used your 3 prompts".
- `apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder"`: a missing key fails late with a generic "AI service error". That is programming by coincidence instead of crashing early.
- `evaluate/route.ts` calls `JSON.parse(session.promptConstraints)` with no validation, and casts the model's `overall_cefr as CefrLevel`.
- Unused dependencies: `@neondatabase/serverless`, `dotenv`, `lucide-react`. `class-variance-authority` and `@base-ui/react` are only used by the unused `ui/button.tsx`.
- `<html lang="en">` on a French app.
- Placement test state lives in a module-level `let placementTest` inside a route file, so it's lost on restart or hot reload. That's not a tooling issue, but it's worth a ticket.

---

## 2. TypeScript compiler flags

| Flag                                    | Verdict                       | Prevents                                                                                                                                                                                    | Cost today                                                                                                                           | Priority     |
| --------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `noUncheckedIndexedAccess`              | **Adopt**                     | `rows[0].usedCount` / `rows[0].count` crashing on empty results (assertive programming). Forces `first(rows)`, or drizzle's `.get()`, which returns `T \| undefined`.                       | 24 errors, roughly 40 lines to fix                                                                                                   | P0           |
| `exactOptionalPropertyTypes`            | **Adopt now while it's free** | Confusing "absent" with "explicitly undefined" in API payloads and `db.update().set()` partials, where `undefined` silently skips a column.                                                 | 0 errors. Later friction: optional React props that receive `undefined`. Fix by typing the prop as `?: T \| undefined` deliberately. | P0           |
| `noFallthroughCasesInSwitch`            | Adopt                         | Accidental fallthrough in phase and correction-kind switches.                                                                                                                               | 0                                                                                                                                    | P0           |
| `noImplicitReturns`                     | Adopt                         | Handlers with a code path that returns nothing.                                                                                                                                             | 0                                                                                                                                    | P0           |
| `noImplicitOverride`                    | Adopt                         | Little value (few classes), but free.                                                                                                                                                       | 0                                                                                                                                    | P0 (same PR) |
| `verbatimModuleSyntax`                  | **Adopt**                     | Value imports of server modules (`@/db`, stores) leaking into client bundles when only a type was needed. `import type` becomes mandatory and visible in review, which supports decoupling. | 0 errors (the code already uses `import type`)                                                                                       | P0           |
| `noPropertyAccessFromIndexSignature`    | Skip                          | Its only hits are `process.env`, which §5 moves into a validated `env.ts`.                                                                                                                  | 3                                                                                                                                    | n/a          |
| `erasableSyntaxOnly`                    | Skip                          | We don't run TS through Node type-stripping, and parameter properties are the existing DI idiom.                                                                                            | 5                                                                                                                                    | n/a          |
| `allowJs: false`, `target: ES2022`      | Adopt                         | There are no JS sources. ES2022 unlocks `.at()` and `Error` `cause`, so boundary errors can carry their Zod issue as `cause`.                                                               | 0                                                                                                                                    | P0           |
| `noUnusedLocals` / `noUnusedParameters` | Skip                          | They would block `tsc` during TDD red/green, and ESLint `no-unused-vars` plus knip already cover this.                                                                                      |                                                                                                                                      | n/a          |

Proposed `tsconfig.json` delta:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "allowJs": false,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true
  }
}
```

Optional, P2: `typedRoutes: true` in `next.config.ts` (stable in Next 16) so that `<Link href>` to `/carnet` or `/historique` is type-checked.

---

## 3. ESLint

### 3.1 Rules and plugins

| Addition                                                                                                                                                                                                                                                                     | Prevents                                                                                                                                                                                                                                | Noise                                                                                                                                                                            | Priority                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `typescript-eslint` `strictTypeChecked` on `src/**` (`projectService: true`)                                                                                                                                                                                                 | Unvalidated `res.json()` / `request.json()` through the `no-unsafe-*` rules (the known problem), `!` assertions, needless casts.                                                                                                        | 155 today, mostly gone after §5. Turn **off** `no-confusing-void-expression` (style noise with arrow shorthand). Set `restrict-template-expressions` to `{ allowNumber: true }`. | P0, after the Zod tickets    |
| `no-floating-promises`, `no-misused-promises` (included in strict)                                                                                                                                                                                                           | `load()` / `refreshQuota()` fired without error handling, and `onClick={async…}` swallowing rejections, which leads to never-cleared UI state. Keep `checksVoidReturn` on: handlers must catch and set an error state, then use `void`. | 14 today                                                                                                                                                                         | P0                           |
| `@typescript-eslint/switch-exhaustiveness-check` `{ considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true }`                                                                                                                                            | Unhandled correction kinds (`mistake \| standard \| dialect`), History statuses and phase unions. A `default:` must not hide a new union member (design by contract).                                                                   | Low                                                                                                                                                                              | P0                           |
| `jsx-a11y` strict rules (the plugin is already registered by Next; spread **only `.rules`** to avoid "Cannot redefine plugin")                                                                                                                                               | Unassociated labels, clickable `div`s. HANDOFF requires real `<button>`, `<label>` and `aria-*`.                                                                                                                                        | 4 today                                                                                                                                                                          | P0                           |
| `react/no-unescaped-entities: ["error", { forbid: [">", "}"] }]`                                                                                                                                                                                                             | Keeps the useful part of the rule, and stops it from fighting French apostrophes.                                                                                                                                                       | Fixes all 3 current errors                                                                                                                                                       | P0                           |
| `react/jsx-no-leaked-render` `{ validStrategies: ["ternary", "coerce"] }` (plugin already installed)                                                                                                                                                                         | `{count && <X/>}` rendering `0`. Mistake counts and quota numbers make this likely.                                                                                                                                                     | Low                                                                                                                                                                              | P1                           |
| `@typescript-eslint/no-restricted-imports` with per-directory overrides (seams; see §3.3)                                                                                                                                                                                    | UI importing `@/db` or stores, domain modules importing Next or React, `openai` imported outside its adapter (decoupling, Law of Demeter, orthogonality). `allowTypeImports: true` where types may cross.                               | 0 today                                                                                                                                                                          | P0                           |
| `import/no-cycle` (plugin already installed)                                                                                                                                                                                                                                 | Circular module graphs as the component tree grows.                                                                                                                                                                                     | Low on a repo this size                                                                                                                                                          | P1                           |
| `@typescript-eslint/no-magic-numbers` on `src/modules`, `src/server`, `src/app/api`, `src/components` (not tests or `src/config`) `{ ignore: [0, 1, -1], ignoreEnums: true, ignoreNumericLiteralTypes: true, ignoreReadonlyClassProperties: true, ignoreTypeIndexes: true }` | Hardcoded quota `3`, `250–300` word targets, `slice(0, 60)` (the known problem). Top-level `const X = 3` is allowed, which pushes literals into named constants.                                                                        | Medium; worth it                                                                                                                                                                 | P1                           |
| `@eslint-community/eslint-plugin-eslint-comments`: `require-description`, `no-unlimited-disable`. Plus `linterOptions.reportUnusedDisableDirectives: "error"`                                                                                                                | Agents silencing rules. Every disable must carry `-- reason`.                                                                                                                                                                           | 1 existing file-wide disable (`writing-evaluator.test.ts`)                                                                                                                       | P0                           |
| `@vitest/eslint-plugin` recommended + `no-focused-tests`, `no-disabled-tests`, `expect-expect`, `no-conditional-expect`, `no-standalone-expect`, `valid-title`, `prefer-called-with`                                                                                         | `.only` and `.skip` sneaking into PRs, tests with no assertions (test ruthlessly).                                                                                                                                                      | Low                                                                                                                                                                              | P0                           |
| `eslint-plugin-testing-library` `flat/react` + `eslint-plugin-jest-dom` recommended, on `*.test.tsx`                                                                                                                                                                         | `container.querySelector`, `fireEvent` instead of `userEvent`, missing `await` on async events. Role- and label-based queries also double as a11y checks.                                                                               | 0 today (no component tests yet), so set it before the first one                                                                                                                 | P0                           |
| `eslint-plugin-playwright` on `e2e/**`: `no-raw-locators`, `prefer-web-first-assertions`, `no-wait-for-timeout`, `no-networkidle`, `no-force-option`                                                                                                                         | Flaky e2e from CSS selectors and sleeps.                                                                                                                                                                                                | 0                                                                                                                                                                                | P1, in the Playwright ticket |
| `eslint-plugin-unused-imports`                                                                                                                                                                                                                                               | **Skip.** Duplicates `no-unused-vars` and knip.                                                                                                                                                                                         |                                                                                                                                                                                  | n/a                          |
| `eslint-plugin-boundaries`                                                                                                                                                                                                                                                   | **Skip for now.** `no-restricted-imports` overrides express our 5 seams with zero new deps and clearer messages. Revisit if the number of layers doubles.                                                                               |                                                                                                                                                                                  | P2                           |

### 3.2 Proposed `eslint.config.mjs`

Sketch; verify plugin import names when installing.

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import vitest from "@vitest/eslint-plugin";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";

const LEGACY = ["src/components/legacy/**"]; // shrinks to [] as redesign tickets land
const TESTS = ["src/**/*.test.{ts,tsx}", "src/test/**"];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  comments.recommended,
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      "@eslint-community/eslint-comments/require-description": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: true,
        },
      ],
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
      "react/jsx-no-leaked-render": [
        "error",
        { validStrategies: ["ternary", "coerce"] },
      ],
      "import/no-cycle": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [...TESTS, "src/config/**"],
    rules: {
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          ignore: [0, 1, -1],
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
    },
  },
  // Seams: see §3.3. Keep file groups disjoint; same-rule overrides replace, not merge.
  {
    files: [
      "src/components/**",
      "src/app/**/page.tsx",
      "src/app/**/layout.tsx",
      "src/hooks/**",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/db",
                "@/db/*",
                "@/server/*",
                "@/modules/*/*-store",
                "drizzle-orm*",
                "@libsql/*",
                "openai",
                "openai/*",
              ],
              message:
                "Client code reaches the server only through fetchJson() from @/lib/http and schemas from @/contracts.",
            },
            {
              group: ["@/modules/*"],
              allowTypeImports: true,
              message:
                "Import domain types from @/contracts; components must not run domain logic directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**"],
    ignores: ["src/modules/openai-client/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "next",
                "next/*",
                "react",
                "react-dom",
                "@/components/*",
                "@/app/*",
              ],
              message: "Domain modules are framework-free (orthogonality).",
            },
            {
              group: ["openai", "openai/*"],
              message:
                "Only src/modules/openai-client talks to the OpenAI SDK.",
            },
          ],
        },
      ],
    },
  },
  {
    files: TESTS,
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/no-conditional-expect": "error",
      "vitest/expect-expect": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  { files: ["src/**/*.test.tsx"], ...testingLibrary.configs["flat/react"] },
  { files: ["src/**/*.test.tsx"], ...jestDom.configs["flat/recommended"] },
  {
    files: LEGACY,
    rules: {
      ...Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.strict.rules).map((r) => [r, "off"]),
      ),
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
```

`nextTs` already registers `@typescript-eslint`. If ESLint throws "Cannot redefine plugin", replace `extends: [tseslint.configs.strictTypeChecked]` with `rules: Object.assign({}, ...tseslint.configs.strictTypeChecked.map((c) => c.rules ?? {}))`.

### 3.3 Module seams

| Layer                                                                                                          | May import                                               | Must not import                                                      |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/contracts/**`: Zod schemas and the types derived from them (`CefrLevel`, `Evaluation`, API bodies, draft) | `zod` only                                               | everything else                                                      |
| `src/modules/**`: pure domain (tracker, placement, prompt-generator, evaluator, dialect)                       | `@/contracts`, `@/config`, `@/lib`                       | `next`, `react`, `@/db`, `openai` (except the openai-client adapter) |
| `src/server/**`: repositories (`@/db`), the AI client factory, `env.ts`, route helpers                         | anything server-side                                     | `@/components`                                                       |
| `src/app/api/**`: thin handlers that call `parseRequestBody` → module → repository                             | `@/server`, `@/modules`, `@/contracts`                   | `@/db` directly (P1, once repositories move to `src/server`)         |
| `src/components/**`, pages                                                                                     | `@/contracts`, `@/copy`, `@/lib/http`, `@/components/ui` | `@/db`, `@/server`, stores, `openai`                                 |

Moving the `*-store.ts` files into `src/server/repositories/` with an injected `db` is a P1 refactor (decoupling, and it makes tests independent of a global). The P0 test isolation in §6 doesn't depend on it.

---

## 4. ast-grep rules

Layout: `sgconfig.yml` at the repo root, rules in `tooling/ast-grep/rules/*.yml`, rule tests in `tooling/ast-grep/tests/*.yml` (run with `ast-grep test`). Every rule needs a test with at least one `valid` and one `invalid` snippet, so rules can't silently match nothing. Suppress an individual hit with `// ast-grep-ignore: <rule-id>` plus a reason on the line above; reviewers reject suppressions that have no reason.

```yaml
# sgconfig.yml
ruleDirs:
  - tooling/ast-grep/rules
testConfigs:
  - testDir: tooling/ast-grep/tests
languageGlobs:
  tsx: ["*.ts"] # parse .ts as TSX so every rule can be `language: Tsx`; <T>x casts are banned anyway
```

This config assumes that legacy UI is moved to `src/components/legacy/` in the ast-grep ticket. UI rules ignore that directory, and the redesign deletes it file by file. That keeps one shared ratchet for ESLint, ast-grep and knip instead of three exception lists.

### P0 rules

```yaml
# tooling/ast-grep/rules/no-json-parse.yml
id: no-json-parse
language: Tsx
severity: error
message: "JSON.parse outside src/lib/json.ts. Use parseJson(Schema, text) and handle the failure branch."
note: |
  `JSON.parse(text) as T` is how a malformed evaluation_json row crashed the History page.
  parseJson returns a Result validated by a Zod schema from @/contracts.
rule:
  pattern: JSON.parse($$$ARGS)
files: ["src/**"]
ignores: ["src/lib/json.ts"]
```

```yaml
# tooling/ast-grep/rules/no-raw-json-body.yml
id: no-raw-json-body
language: Tsx
severity: error
message: "Read request/response bodies with parseRequestBody(request, Schema) or fetchJson(url, Schema)."
note: "`await request.json()` is `any`: unvalidated API bodies and the ~100 no-unsafe-* lint hits come from here."
rule:
  pattern: $R.json()
files: ["src/**"]
ignores: ["src/lib/http/**"]
```

`NextResponse.json(x)` takes an argument, so it doesn't match `$R.json()`.

```yaml
# tooling/ast-grep/rules/no-utc-date-key.yml
id: no-utc-date-key
language: Tsx
severity: error
message: "toISOString() is UTC. Use localDateKey(date) from src/lib/dates.ts."
note: "The quota resets at local midnight (CONTEXT.md). At 21:00 in Louisiana the UTC date is already tomorrow."
rule:
  any:
    - pattern: $D.toISOString().split($$$)
    - pattern: $D.toISOString().slice($$$)
    - pattern: $D.toISOString().substring($$$)
    - pattern: $D.toISOString().substr($$$)
files: ["src/**"]
```

```yaml
# tooling/ast-grep/rules/no-adhoc-date-format.yml
id: no-adhoc-date-format
language: Tsx
severity: error
message: "Format dates through src/lib/dates.ts (French formats like `21 h 42` live there once)."
rule:
  any:
    - pattern: $D.toLocaleDateString($$$)
    - pattern: $D.toLocaleTimeString($$$)
    - pattern: $D.toLocaleString($$$)
    - pattern: new Intl.DateTimeFormat($$$)
files: ["src/**"]
ignores: ["src/lib/dates.ts", "src/components/legacy/**"]
```

```yaml
# tooling/ast-grep/rules/no-app-db-in-tests.yml
id: no-app-db-in-tests
language: Tsx
severity: error
message: "Tests must not import @/db. Use createTestDb() from @/test/db (in-memory libsql + migrations)."
note: "history-store.test.ts deleted every session in the real data.db."
rule:
  kind: import_statement
  has:
    field: source
    regex: '^["'']@/db["'']$'
files: ["src/**/*.test.ts", "src/**/*.test.tsx", "e2e/**"]
```

```yaml
# tooling/ast-grep/rules/dialect-rules-single-source.yml
id: dialect-rules-single-source
language: Tsx
severity: error
message: "Louisiana French rule text lives only in src/modules/dialect. Import it; tests assert against the exported constant."
note: "The dialect rules were copy-pasted into prompt-generator.ts and writing-evaluator.ts and drifted apart."
rule:
  any:
    - kind: string
    - kind: template_string
    - kind: jsx_text
  regex: "(?i)(eux-autre|vous-autre|nous-autre|\\beusse\\b|être après|futur proche|cocodrie|maringouin|chaoui)"
files: ["src/**"]
ignores: ["src/modules/dialect/**", "src/copy/**"]
```

`src/copy/**` is exempt because HANDOFF UI copy legitimately says `Oui, c'est à nous-autres`.

```yaml
# tooling/ast-grep/rules/dialect-id-single-source.yml
id: dialect-id-single-source
language: Tsx
severity: error
message: 'Use DEFAULT_DIALECT / the Dialect schema from src/modules/dialect instead of the literal "louisiana".'
rule:
  kind: string
  regex: '^["'']louisiana["'']$'
files: ["src/**"]
ignores: ["src/modules/dialect/**"]
```

```yaml
# tooling/ast-grep/rules/no-raw-interactive-element.yml
id: no-raw-interactive-element
language: Tsx
severity: error
message: "Use the primitives in src/components/ui (Button, IconButton, TextField, TextArea, Select)."
note: |
  Primitives own focus rings, 44px targets, busy/disabled styling, aria-label on icon buttons,
  and <label htmlFor> association. Raw elements are where unlabeled inputs came from.
rule:
  any:
    - kind: jsx_opening_element
    - kind: jsx_self_closing_element
  has:
    field: name
    regex: "^(button|input|textarea|select)$"
files: ["src/**/*.tsx"]
ignores: ["src/components/ui/**", "src/components/legacy/**"]
```

```yaml
# tooling/ast-grep/rules/no-raw-color.yml
id: no-raw-color
language: Tsx
severity: error
message: "No raw colors in TS/TSX. Use token classes (bg-sheet, text-ink, border-line, …) from src/styles/tokens.css."
rule:
  any:
    - kind: string
    - kind: template_string
  regex: "#[0-9a-fA-F]{3,8}\\b|\\b(rgba?|hsla?|oklch)\\("
files: ["src/**"]
ignores: ["src/components/legacy/**"]
```

```yaml
# tooling/ast-grep/rules/no-raw-color-css.yml
id: no-raw-color-css
language: Css
severity: error
message: "Colors are defined once in src/styles/tokens.css; reference var(--color-*) elsewhere."
rule:
  any:
    - kind: color_value
    - kind: call_expression
      regex: "^(rgba?|hsla?|oklch)\\("
files: ["src/**/*.css"]
ignores: ["src/styles/tokens.css"]
```

```yaml
# tooling/ast-grep/rules/no-tailwind-default-palette.yml
id: no-tailwind-default-palette
language: Tsx
severity: error
message: "Default Tailwind palette classes are off-system. Use design tokens (desk, sheet, ink, muted, line, primary, mistake, standard, dialect…)."
rule:
  any:
    - kind: string
    - kind: template_string
  regex: "\\b(bg|text|border|ring|outline|fill|stroke|divide|placeholder|from|via|to|shadow|accent|caret|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b"
files: ["src/**"]
ignores: ["src/components/legacy/**"]
```

```yaml
# tooling/ast-grep/rules/no-boolean-loading-state.yml
id: no-boolean-loading-state
language: Tsx
severity: error
message: "Model async UI as a discriminated union (idle | generating | evaluating | error), not a boolean."
note: |
  One `loading` boolean drove both Generate and Submit, so the submit button showed "Generating...".
  HANDOFF requires distinct labels: `Je cherche une consigne…` vs `Je lis ton texte…`.
rule:
  any:
    - pattern: const [$STATE, $SETTER] = useState($$$INIT)
    - pattern: const [$STATE, $SETTER] = useState<$T>($$$INIT)
constraints:
  STATE:
    regex: "(?i)^(is)?(loading|busy|pending|submitting|generating|evaluating)$"
files: ["src/**/*.tsx"]
ignores: ["src/components/legacy/**"]
```

```yaml
# tooling/ast-grep/rules/no-process-env.yml
id: no-process-env
language: Tsx
severity: error
message: "Read configuration through getEnv() from src/server/env.ts (Zod-validated, fails fast)."
note: '`process.env.OPENAI_API_KEY ?? "sk-placeholder"` hid a missing key until the first AI call.'
rule:
  pattern: process.env
files: ["src/**"]
ignores: ["src/server/env.ts"]
```

```yaml
# tooling/ast-grep/rules/no-inline-model-name.yml
id: no-inline-model-name
language: Tsx
severity: error
message: "Model names live in src/config/ai.ts."
rule:
  kind: string
  regex: "^[\"'](gpt-|o\\d|chatgpt-)"
files: ["src/**"]
ignores: ["src/config/**"]
```

```yaml
# tooling/ast-grep/rules/no-scaffold-leftovers.yml
id: no-scaffold-leftovers
language: Tsx
severity: error
message: "create-next-app boilerplate. Replace with real product metadata/fonts."
rule:
  any:
    - kind: string
    - kind: jsx_text
  regex: "(?i)create next app|generated by create next app|\\bgeist\\b|vercel\\.svg|next\\.svg"
files: ["src/**"]
```

### P1 rules

```yaml
# tooling/ast-grep/rules/no-type-assertion.yml
id: no-type-assertion
language: Tsx
severity: error
message: "No `as` casts in production code (except `as const`). Parse with a schema or narrow with a type guard."
note: "`overall_cefr as CefrLevel` and `JSON.parse(x) as T` assert facts the program never checked (programming by coincidence)."
rule:
  kind: as_expression
  not:
    regex: "\\bas\\s+const$"
files: ["src/**"]
ignores: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"]
```

```yaml
# tooling/ast-grep/rules/no-mocking-own-modules.yml
id: no-mocking-own-modules
language: Tsx
severity: error
message: "Don't vi.mock our own modules. Inject a fake through the constructor/factory (see OpenAiClientLike)."
note: "Module mocks couple tests to file layout and make refactors break tests that should not care."
rule:
  pattern: vi.mock($PATH, $$$REST)
constraints:
  PATH:
    regex: "^[\"'](@/|\\./|\\.\\./)"
files: ["src/**/*.test.ts", "src/**/*.test.tsx"]
```

```yaml
# tooling/ast-grep/rules/no-direct-ai-client.yml
id: no-direct-ai-client
language: Tsx
severity: error
message: "Get the AI client from getAiClient() in src/server/ai-client.ts so e2e can swap in the fake."
rule:
  any:
    - pattern: new OpenAiClient($$$)
    - pattern: new OpenAI($$$)
files: ["src/**"]
ignores: ["src/server/ai-client.ts", "src/modules/openai-client/**"]
```

### Rule test example

```yaml
# tooling/ast-grep/tests/no-utc-date-key-test.yml
id: no-utc-date-key
valid:
  - "const key = localDateKey(new Date());"
  - "const stamp = new Date().toISOString();"
invalid:
  - "const today = new Date().toISOString().split('T')[0];"
  - "const d = now.toISOString().slice(0, 10);"
```

Magic numbers are left to ESLint `no-magic-numbers` (§3.1) rather than ast-grep, because pattern-matching specific literals like `3` would be fragile.

---

## 5. Runtime validation: Zod at every boundary

**Choose Zod 4, not Valibot.** It's already resolved in the tree. OpenAI's SDK ships `openai/helpers/zod` (`zodResponseFormat`; verify Zod 4 support in the installed `openai@6` before relying on it). Zod 4 has `z.prettifyError` for 400 responses. Bundle size, Valibot's advantage, is irrelevant here because schemas run server-side and in small client parsers.

The rule is **schemas are the single source of truth; types are `z.infer`'d from them, never hand-written in parallel.**

| Boundary                                                      | Helper                                                                                                                                                                                                                                                                                                                                                                     | Known problem it fixes                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| LLM output                                                    | `chatCompletionJSON(Schema, params)` → `safeParse` → throws `AiOutputError` (with `cause` = Zod error), which the route maps to a 502 the UI can retry. Better: pass `zodResponseFormat(EvaluationSchema, "evaluation")` so the **hand-written JSON shape in the system prompt is deleted**, making the schema the single description shared by TS, runtime and the model. | `JSON.parse(text) as T`, plus the evaluation shape duplicated in the prompt       |
| API request bodies                                            | `parseRequestBody(request, Schema): Promise<Result<T, Response>>`. On failure it returns a ready-made `400` with `z.prettifyError`.                                                                                                                                                                                                                                        | `request.json()` used directly                                                    |
| Client fetches                                                | `fetchJson(url, Schema, init?): Promise<Result<T, FetchError>>`, where `FetchError = { kind: "network" } \| { kind: "http"; status; message } \| { kind: "invalid" }`. Maps directly to HANDOFF states (offline notice, `role="alert"`, retry).                                                                                                                            | `await res.json()` assigned straight into state                                   |
| DB JSON columns (`evaluation_json`, `prompt_constraints`)     | Repositories parse on read and return `SessionView = { ok: true; …parsed } \| { ok: false; id; createdAt; reason }`. History renders the `ok: false` branch as an inline notice.                                                                                                                                                                                           | History crashes on malformed JSON (HANDOFF: "the list must never blank or crash") |
| DB enum-ish text columns (`to_level`, `source`, `cefr_level`) | `CefrLevel.parse(row.toLevel)` in the repository. Drizzle `text({ enum: CEFR_LEVELS })` narrows the TS type but doesn't validate legacy rows.                                                                                                                                                                                                                              | `as CefrLevel` / `as "auto" \| "manual"` casts                                    |
| Environment                                                   | `getEnv()` memoized, `z.object({ OPENAI_API_KEY: …, DATABASE_URL: …, AI_CLIENT: z.enum(["openai","fake"]).default("openai") })` with a refinement that the key is required unless `AI_CLIENT=fake`. Lazy (not at import) so `next build` doesn't need secrets.                                                                                                             | `"sk-placeholder"` fallback                                                       |
| localStorage draft (new in HANDOFF autosave)                  | `DraftSchema.safeParse` on load. Discard and notice on failure.                                                                                                                                                                                                                                                                                                            | The next malformed-JSON crash before it happens                                   |

Single-source examples for `src/contracts`:

```ts
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const CefrLevel = z.enum(CEFR_LEVELS);
export type CefrLevel = z.infer<typeof CefrLevel>;
```

This replaces both existing `CefrLevel` unions and the hand-maintained `CEFR_ORDER` (derive it from the index in `CEFR_LEVELS`).

Contract tests: every fixture in `src/test/fixtures/ai/*.json` (also used by the Playwright fake) is parsed by its schema in a unit test, so fixtures can't drift from the schema.

---

## 6. Scripts, test isolation, knip, formatting

### `package.json` scripts

```json
{
  "typecheck": "tsc --noEmit",
  "lint": "eslint --max-warnings=0",
  "lint:ast": "ast-grep scan && ast-grep test --skip-snapshot-tests",
  "knip": "knip",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "TZ=America/Chicago vitest run",
  "test:watch": "TZ=America/Chicago vitest",
  "test:e2e": "playwright test",
  "check": "npm run typecheck && npm run lint && npm run lint:ast && npm run knip && npm run format:check && npm test",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "pr:size": "git diff --numstat origin/main...HEAD -- src ':!src/**/*.test.*' ':!src/test/**' | awk '{a+=$1} END {print a\" production lines added\"; exit (a>500)}'"
}
```

- `check` is the one command agents run. CI runs `check`, then `test:e2e`.
- `TZ=America/Chicago` makes every run fall in a zone where evening local time and the UTC date differ. A `localDateKey` test with `vi.setSystemTime("2026-11-14T21:30:00-06:00")` expecting `"2026-11-14"` is the regression test for the UTC bug.
- `pr:size` turns the 500-line budget into a number instead of an argument. Tests, fixtures and docs are excluded.
- Replace `db:push` with `db:generate` + `db:migrate`. Versioned migrations are needed for the test DB, and they keep schema changes reversible. Commit `drizzle/`.

### Test DB isolation (P0, before any other ticket runs `npm test`)

1. Generate the initial migration from the current schema (`drizzle/0000_*.sql`).
2. `vitest.config.ts`: `test.env = { DATABASE_URL: ":memory:", AI_CLIENT: "fake" }`, `restoreMocks: true`, `unstubEnvs: true`, `globals: false`. Split into two `projects`: `node` (`*.test.ts`, setup `src/test/setup-db.ts`) and `dom` (`*.test.tsx`, `environment: "jsdom"`, setup `src/test/setup-dom.ts` importing `@testing-library/jest-dom/vitest`).
3. `src/test/db.ts`: `createTestDb()` builds a `createClient({ url: ":memory:" })`, runs `migrate(db, { migrationsFolder: "drizzle" })` and returns `{ db, reset }`. Each test file gets a fresh DB (Vitest isolates modules per file).
4. **Crash early** in `getEnv()`/`src/db`: if `VITEST` is set and `DATABASE_URL !== ":memory:"`, throw `Refusing to open <url> under Vitest`. This guard holds even when an agent forgets the helper.
5. Acceptance check: `sha256sum data.db` is identical before and after `npm test`.

### knip (P0, folded into the dead-code ticket)

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "project": ["src/**/*.{ts,tsx}"],
  "ignoreDependencies": ["tailwindcss", "tw-animate-css", "shadcn"]
}
```

knip's Next.js, Vitest, Playwright and Drizzle plugins auto-detect entry points. Today it should report `QuotaManager` (+ test), `ui/button.tsx`, `initTracker`, `@neondatabase/serverless`, `dotenv`, `lucide-react`, `class-variance-authority` and `@base-ui/react`. Delete them all and re-add a dependency in the PR that needs it (YAGNI; reversing is a one-line install). The CSS-only dependencies are ignored because knip doesn't follow `@import` in CSS by default.

### Prettier (P0, its own mechanical ticket)

Add Prettier with `prettier-plugin-tailwindcss` for deterministic class order. Without a formatter, agent PRs carry whitespace churn that inflates diffs and wastes adversarial review. Land it as a format-only PR before redesign work starts, exempt from the line budget. Add the commit to `.git-blame-ignore-revs`.

---

## 7. Pre-commit: lefthook

**Lefthook rather than husky + lint-staged**: one binary, parallel commands, built-in `{staged_files}`, and `stage_fixed`. This **requires the project to have its own git repo first**. Installing it in `~/Personal-Projects` would set hooks for every unrelated project there.

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    prettier:
      glob: "*.{ts,tsx,css,md,json,yml,yaml}"
      run: npx prettier --write {staged_files}
      stage_fixed: true
    eslint:
      glob: "*.{ts,tsx}"
      run: npx eslint --max-warnings=0 {staged_files}
    ast-grep:
      glob: "*.{ts,tsx,css}"
      run: npx ast-grep scan {staged_files}
    typecheck:
      glob: "*.{ts,tsx}"
      run: npx tsc --noEmit
pre-push:
  commands:
    check:
      run: npm run check
```

Hooks are a convenience; CI is the gate. In the agent configuration, deny `--no-verify` (see §10). Priority P1.

**CI** (P0, in the baseline ticket): `.github/workflows/check.yml` on `pull_request`, running `npm ci && npm run check`, plus a second job running `npx playwright install --with-deps chromium && npm run test:e2e` once the e2e ticket lands.

---

## 8. Playwright conventions (P1; land with or right before the first Home-phase ticket)

- **OpenAI is called server-side from route handlers, so `page.route()` can't intercept it.** Use a **fake client injected by env**:
  - `src/server/ai-client.ts` has `getAiClient()`, which returns `FakeAiClient` when `getEnv().AI_CLIENT === "fake"`.
  - The fake serves fixtures from `src/test/fixtures/ai/` that are validated by the same Zod schemas.
  - Scenario selection: the route passes `request.headers.get("x-e2e-scenario")` to the fake (`ok`, `malformed`, `error`, `slow`), and the test sets it with `page.setExtraHTTPHeaders`. The header is ignored unless `AI_CLIENT=fake`.
- **Use `page.route()` only for client-visible failures**: `route.abort()` on `/api/evaluate` for the offline notice, and `route.fulfill({ status: 500 })` for the `role="alert"` retry state.
- **DB**: `webServer` runs `next build && next start -p 3100` with `DATABASE_URL=file:./.e2e/e2e.db AI_CLIENT=fake` (`reuseExistingServer: !process.env.CI`). `globalSetup` deletes and migrates `.e2e/e2e.db`. A `resetDb` fixture truncates tables before each test through its own libsql connection. `workers: 1` because it's one SQLite file and the quota is shared state. Add `.e2e/` to `.gitignore`.
- **Projects**: `desktop` (1280×800) and `mobile` (390×844), matching the HANDOFF breakpoints.
- **Locators**: only `getByRole`, `getByLabel`, `getByText` (enforced by `eslint-plugin-playwright` `no-raw-locators`). No `waitForTimeout`; use web-first assertions.
- **Accessibility**: `@axe-core/playwright` `expect(violations).toEqual([])` once per screen state. This enforces HANDOFF's contrast and labeling rules end to end.
- **Tracer bullet spec first**: `e2e/home.spec.ts` covers pick level → generate prompt → write → submit → Corrections visible and focused → History shows the session. Each redesign ticket extends one spec and doesn't create new harnesses.

---

## 9. Design tokens (P0, before any redesign component ticket)

- `src/styles/tokens.css`, imported by `globals.css`, is the **only** file allowed to contain color literals (enforced by `no-raw-color-css`).
- Use Tailwind 4 `@theme`:
  - Colors: `--color-desk`, `--color-sheet`, `--color-ink`, `--color-ink-2`, `--color-muted`, `--color-disabled-text`, `--color-line`, `--color-line-strong`, `--color-input-border`, `--color-rule`, `--color-primary`, `--color-primary-hover`, `--color-primary-tint`, `--color-meter-target`, `--color-busy`, `--color-notice`, `--color-mistake`, `--color-mistake-tint`, `--color-standard`, `--color-dialect`, `--color-dialect-tint`, `--color-scrim`.
  - Shape and type: `--radius-DEFAULT: 6px`, `--radius-chip: 22px`, `--shadow-sheet`, `--font-ui`, `--font-prose`, `--text-page-title` (+ `--line-height`/`--letter-spacing` sub-vars), `--text-prompt`, `--text-learner`, `--container-home: 760px`, `--container-wide: 860px`, `--container-review: 1200px`.
- Fonts via `next/font/google`: Bricolage Grotesque with `variable: "--font-bricolage"` and Newsreader with `variable: "--font-newsreader"`. Then `--font-ui: var(--font-bricolage), 'Trebuchet MS', sans-serif`. **The next/font variable name must never equal a theme variable name.** `--font-sans: var(--font-sans)` is the self-reference that broke the font.
- **Token contract test** (`src/styles/tokens.test.ts`, about 60 lines, no new deps):
  1. Every HANDOFF token exists with the exact hex.
  2. No custom property is defined as `var()` of itself, which guards against the font bug.
  3. WCAG contrast is ≥ 4.5:1 for every text pair HANDOFF uses: ink, ink-2, muted, primary, mistake, standard and dialect on sheet; mistake on mistake-tint; dialect on dialect-tint; sheet on primary; sheet on busy.

  Design by contract on the design system: if someone tweaks a color, the test tells them whether it's still accessible.

- After the last legacy component is deleted, add `--color-*: initial;` at the top of `@theme`. Default palette classes then stop existing, and the ast-grep palette rule catches any that still appear in source. Also remove the shadcn `oklch` variables then.
- Also in this ticket: `metadata` with the real title (`Lâche pas.` placeholder per HANDOFF), `<html lang="fr">`, and Geist removed (`no-scaffold-leftovers` keeps it out).

---

## 10. Agent configuration files

- Keep **`AGENTS.md` as the single source** of agent rules. `CLAUDE.md` already imports it, and Cursor and opencode read it. Don't duplicate rules into `.cursor/rules/`. If you add file-scoped Cursor rules later (P2), each one should be a one-line pointer to an AGENTS.md section plus a glob.
- `opencode.json`: keep allow-by-default but deny the destructive escapes. Verify the exact permission syntax against the opencode docs.

  ```json
  {
    "$schema": "https://opencode.ai/config.json",
    "permission": {
      "bash": {
        "*": "allow",
        "*--no-verify*": "deny",
        "git push --force*": "deny",
        "git push -f*": "deny",
        "rm -rf *": "deny",
        "sqlite3 data.db*": "deny"
      }
    }
  }
  ```

- P2: an after-edit hook (Claude Code `PostToolUse` / Cursor hooks) that runs `ast-grep scan <file>` and `eslint <file>`, so agents see violations immediately instead of at commit time.

---

## 11. Priority summary

| #   | Recommendation                                                                                               | Prevents                                                                       | Cost / noise              | Priority | Own ticket?                                             |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------- | -------- | ------------------------------------------------------- |
| 1   | Own git repo, `*.db` in `.gitignore`                                                                         | No PRs possible, personal data committed                                       | Trivial                   | P0       | Yes (TOOL-0)                                            |
| 2   | Test DB isolation + Vitest guard + migrations                                                                | Tests wiping `data.db`                                                         | ~120 lines                | P0       | Yes (TOOL-1)                                            |
| 3   | TS flags + `check` script + CI + lint baseline green                                                         | Index crashes, client/server import leaks, broken windows                      | ~60 lines of fixes        | P0       | Yes (TOOL-2)                                            |
| 4   | Prettier format-only pass                                                                                    | Diff churn in every agent PR                                                   | Mechanical                | P0       | Yes (TOOL-3)                                            |
| 5   | Zod contracts: LLM + DB JSON + `CefrLevel` single source                                                     | `JSON.parse as T`, History crash, duplicated unions                            | ~300 lines                | P0       | Yes (TOOL-4)                                            |
| 6   | Zod: API bodies, `fetchJson`, `env.ts`                                                                       | Unvalidated bodies, `sk-placeholder`, `no-unsafe-*`                            | ~300 lines                | P0       | Yes (TOOL-5)                                            |
| 7   | Dialect module, `src/config`, `src/lib/dates`, knip + deletions                                              | Dialect copy-paste, magic numbers, UTC date, dead code                         | ~250 lines (net negative) | P0       | Yes (TOOL-6)                                            |
| 8   | ast-grep rules + legacy dir move                                                                             | Recurrence of all of the above                                                 | ~350 lines YAML           | P0       | Yes (TOOL-7)                                            |
| 9   | ESLint strict-type-checked, seams, a11y, vitest/testing-library, eslint-comments                             | Floating promises, non-exhaustive switches, a11y, bad tests, silent disables   | ~150 config + fixes       | P0       | Yes (TOOL-8)                                            |
| 10  | Design tokens + fonts + metadata + contract test                                                             | Raw hex, self-referential font var, boilerplate metadata, contrast regressions | ~200 lines                | P0       | Yes (TOOL-9)                                            |
| 11  | Playwright + fake AI client + axe                                                                            | Untested end-to-end flows, a11y regressions                                    | ~300 lines                | P1       | Yes (TOOL-10)                                           |
| 12  | Lefthook                                                                                                     | Slow feedback                                                                  | ~30 lines                 | P1       | Yes (TOOL-11)                                           |
| 13  | `no-magic-numbers`, `no-type-assertion`, `no-mocking-own-modules`, `jsx-no-leaked-render`, `import/no-cycle` | Casts, magic numbers, brittle tests                                            | Medium noise              | P1       | Fold into TOOL-8 / TOOL-7 if under budget, else TOOL-12 |
| 14  | Repositories under `src/server` with injected `db`; placement state persisted                                | Global-DB coupling, lost placement test                                        | ~250 lines                | P1       | Yes                                                     |
| 15  | `typedRoutes`, after-edit hooks, `eslint-plugin-boundaries`, Stryker mutation testing on `src/modules`       | Extra rigor                                                                    | Varies                    | P2       | Later                                                   |

---

## 12. Proposed tooling tickets, in order

Each ticket stays under ~500 lines of production/config code (tests excluded) and leaves `npm run check` green.

1. **TOOL-0: Give the app its own repo.**
   - `git init` in `french-writing-prompter/`, create the GitHub repo, and push.
   - Add `*.db`, `.e2e/`, `playwright-report/`, `test-results/` to `.gitignore`.
   - Decide whether `~/Personal-Projects` should ignore the folder or keep it as a submodule.
   - _Acceptance:_ `git rev-parse --show-toplevel` is the app directory; `git ls-files | grep '\.db$'` is empty; `gh repo view` resolves to the new repo; `docs/agents/issue-tracker.md` still holds.

2. **TOOL-1: Isolated test database.**
   - Add `drizzle/` migrations, `db:generate`/`db:migrate`, `src/test/db.ts`, and the Vitest `projects` (node + jsdom) with setup files.
   - Add the guard that throws under Vitest for non-memory URLs.
   - Migrate `history-store.test.ts` to `createTestDb()`.
   - _Acceptance:_ `sha256sum data.db` is unchanged across `npm test`; a test proves that opening a `file:` URL under Vitest throws; a trivial `.test.tsx` renders in jsdom with jest-dom matchers.

3. **TOOL-2: Baseline green + `check` + CI.**
   - Apply the tsconfig delta from §2 and fix the 24 `noUncheckedIndexedAccess` errors (use drizzle `.get()` or a `first()` helper that throws with context).
   - Set `react/no-unescaped-entities` `forbid: [">", "}"]`.
   - Add the `typecheck`, `check` and `pr:size` scripts and the GitHub Actions workflow.
   - _Acceptance:_ `npm run check` exits 0 locally and in CI on a PR; `pr:size` prints a number.

4. **TOOL-3: Prettier.**
   - Add the config and Tailwind plugin, run one format-only commit, and add `.git-blame-ignore-revs`.
   - _Acceptance:_ `format:check` is in `check` and passes; the PR contains no semantic changes (reviewer diffs with `-w`).

5. **TOOL-4: Contracts for LLM output and stored JSON.**
   - Add `zod` as a direct dependency and `src/contracts/{cefr,evaluation,prompt,session}.ts`.
   - Add `src/lib/json.ts` `parseJson`, and change `chatCompletionJSON(Schema, …)` (with `zodResponseFormat` if it's compatible).
   - Delete the prose JSON shape from the evaluator prompt.
   - Make the repositories return `SessionView`, and have the History page render the `ok: false` notice.
   - Delete both hand-written `CefrLevel` unions.
   - _Acceptance:_ a test feeds malformed model output and gets `AiOutputError`, which the route maps to 502; a test seeds a row with `evaluation_json = "{oops"` and the History list renders it with a notice instead of throwing; `rg "type CefrLevel ="` matches only `src/contracts`.

6. **TOOL-5: Contracts for HTTP and env.**
   - Add `parseRequestBody`, `fetchJson` with the `FetchError` union, and `src/server/env.ts` with `getEnv()`.
   - Convert all 6 routes and all client fetches.
   - _Acceptance:_ each POST/PUT route has a test asserting 400 with a readable message for a bad body; a missing `OPENAI_API_KEY` throws a named error at first `getEnv()` (not "AI service error"); the `no-unsafe-*` count from the strict probe is ≤ 10.

7. **TOOL-6: Single sources + dead code.**
   - Add `src/modules/dialect/louisiana.ts` (rules text, `DEFAULT_DIALECT`, `Dialect` schema), imported by the generator and evaluator. CONTEXT.md's Louisiana French entry keeps the glossary definition and names this file as the canonical rule list.
   - Add `src/config/{limits,ai}.ts` (`DAILY_PROMPT_QUOTA`, `WORD_TARGET`, `PLACEMENT_STEPS`, `ADVANCEMENT_STREAK`, `AI_MODEL`).
   - Add `src/lib/dates.ts` (`localDateKey`, French formatters) with TZ-pinned tests.
   - Add knip, delete everything it flags, and add `knip` to `check`.
   - _Acceptance:_ the dialect rule text appears once in `src/`; the evaluator and generator tests assert `toContain(LOUISIANA_RULES)`; the 21:30 Chicago test passes; `npm run knip` exits 0.

8. **TOOL-7: ast-grep.**
   - Add `@ast-grep/cli` as a devDependency (so it's never confused with `/usr/bin/sg`), `sgconfig.yml`, all P0 rules from §4 with tests, and `git mv` the legacy UI into `src/components/legacy/`.
   - _Acceptance:_ `npm run lint:ast` passes; each rule has a test with ≥ 1 valid and ≥ 1 invalid case; reintroducing `JSON.parse(x) as T` or `toISOString().split` in a scratch branch fails `check`.

9. **TOOL-8: ESLint hardening.**
   - Apply the §3.2 config: strict-type-checked, exhaustiveness, seams, jsx-a11y strict, eslint-comments, vitest, testing-library, jest-dom. Fix the remaining violations outside `legacy/`.
   - _Acceptance:_ `lint` passes with `--max-warnings=0`; a scratch import of `@/db` from a component fails with the seam message; an `eslint-disable` without `-- reason` fails.

10. **TOOL-9: Design tokens.**
    - Add `tokens.css` with the HANDOFF tokens, next/font Bricolage Grotesque + Newsreader, `lang="fr"`, real metadata, the token contract test (presence, no self-reference, contrast), and `no-scaffold-leftovers`.
    - _Acceptance:_ the contract test passes; `bg-sheet text-ink font-ui` render the right computed styles in a jsdom smoke test or a Playwright check; the raw-color rules pass outside `legacy/`.

11. **TOOL-10: Playwright tracer bullet.**
    - Add the config, `getAiClient()` + `FakeAiClient` + scenario header, the e2e DB lifecycle, `eslint-plugin-playwright`, axe, a CI job, and a `home.spec.ts` that runs the current flow end to end on desktop and mobile.
    - _Acceptance:_ `npm run test:e2e` passes in CI with no network access to OpenAI; the `malformed` scenario shows the retry alert; axe reports 0 violations on the screens touched.

12. **TOOL-11: Lefthook** (after TOOL-0).
    - Add `lefthook.yml` from §7, plus a `prepare` script running `lefthook install`.
    - _Acceptance:_ committing a file with `toISOString().split` is rejected locally; `git push` runs `check`.

TOOL-1 through TOOL-9 should land before redesign ticket #1. TOOL-10 must land before the first Home-phase ticket is accepted.

---

## 13. Agent instructions to add to `AGENTS.md`

Paste under a `## Engineering rules` heading. Keep each one short; tooling enforces most of them, and these explain the intent.

```md
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

- Components → `@/contracts`, `@/copy`, `@/lib/http`, `@/components/ui` only. Never `@/db`, `@/server`, stores, or `openai`.
- `src/modules` is framework-free (no `next`, `react`, `@/db`). Only `src/modules/openai-client` imports `openai`.
- Route handlers stay thin: parse → call module → persist via repository → respond.
```

---

## 14. Backlog from PR #52 tooling review (2026-11-15)

Not in T13c scope; file as separate tooling tickets when convenient.

| ID (draft)  | Rule / change                                                                                 | Notes                                                            |
| ----------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| TOOL-PR52-1 | `quota-state-single-source` (ast-grep) + tighten ESLint `@/modules/*-store` type-import allow | `QuotaState` = `z.infer<typeof QuotaGetResponse>`                |
| TOOL-PR52-2 | `@typescript-eslint/no-unsafe-type-assertion`                                                 | 7 known hits including `LevelMenu` `as CefrLevel`                |
| TOOL-PR52-3 | `no-hardcoded-daily-quota`, `no-new-date-in-components`, `no-window-event-bus`                | Header quota copy and `HEADER_SHELL_REFRESH_EVENT`               |
| TOOL-PR52-4 | `no-arbitrary-token-length`, `no-e2e-viewport-override`                                       | Tokens vs `rounded-[22px]`; viewport in `playwright.config` only |
| TOOL-PR52-5 | `no-mocking-own-modules`                                                                      | `layout.test.tsx` mocks `HeaderShell`                            |

### Backlog from PR #54 tooling review (2026-11-15)

| ID (draft)  | Rule / change                                                                  | Notes                                                     |
| ----------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| TOOL-PR54-1 | Widen `no-boolean-loading-state` to `*Ready`                                   | `levelReady` / `quotaReady`; failed fetch leaves blank UI |
| TOOL-PR54-2 | `no-wall-clock-sleep-in-tests`                                                 | `header-shell.test.tsx` setTimeout race                   |
| TOOL-PR54-3 | `no-e2e-evaluate`                                                              | `header-helpers.ts` `data-highlighted` poll               |
| TOOL-PR54-4 | `cefr-count-single-source`                                                     | `CEFR_LEVELS_IN_MENU = 6` in e2e                          |
| TOOL-PR54-5 | `no-e2e-viewport-override`                                                     | duplicate `test.use` viewports in one spec                |
| TOOL-PR54-6 | `no-hardcoded-daily-quota`                                                     | `sur 3` in `quotaMessage` strings                         |
| TOOL-PR54-7 | ESLint `allowTypeImports` negation for `*-store` + `quota-state-single-source` | hand-written `QuotaState` in store                        |
| TOOL-PR54-8 | `no-arbitrary-chip-radius`                                                     | `rounded-[22px]` vs `rounded-chip`                        |
| TOOL-PR54-9 | Unit test: stale `GET /api/level` vs `onLevelChange`                           | no generation guard on level fetch                        |

### Backlog from PR #57 tooling review (2026-11-15)

| ID (draft)  | Rule                         | Notes                                                            |
| ----------- | ---------------------------- | ---------------------------------------------------------------- |
| TOOL-PR57-1 | `no-e2e-layout-geometry`     | `boundingBox` / `children.length` in `expectTwoMobileHeaderRows` |
| TOOL-PR57-2 | `no-display-contents`        | `sm:contents` on header row wrappers                             |
| TOOL-PR57-3 | `no-effect-writes-own-dep`   | `syncFromShell` + `setData` retriggers effect                    |
| TOOL-PR57-4 | `level-get-needs-generation` | implement `levelFetchGen` (TOOLS-PR54-9 product fix → **T13f**)  |

### Backlog from PR #62 tooling review (2026-11-15)

Non-blocking for T14b merge; prioritize before T15+ Home work.

| ID (draft)  | Rule / change                                                              | Notes                                                            |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| TOOL-PR62-1 | `no-arbitrary-tailwind-bracket` + HANDOFF Home typography ratchet          | `text-[26px]` etc. vs `text-wordmark-sm`; extend `theme.test.ts` |
| TOOL-PR62-2 | Quota & placement counts in copy (`DAILY_PROMPT_QUOTA`, `PLACEMENT_STEPS`) | `(3 consignes)` / `sur 3` literals in `src/copy` and e2e         |
| TOOL-PR62-3 | `ui-copy-single-source` (ast-grep)                                         | `Chargement…`, placement header label → `src/copy`               |
| TOOL-PR62-4 | `no-redesign-legacy-import` from `home/` / `app/`                          | `EvaluationCard` bridge until T16/T21                            |
| TOOL-PR62-5 | Land `no-mocking-own-modules` + refactor `home-page.test`                  | See TOOL-PR52-5                                                  |
| TOOL-PR62-6 | `allowDefaultProject` production denylist test in `eslint-config.test.ts`  | Regress allowlist on real `src/components/*`                     |
| TOOL-PR62-7 | E2e hygiene bundle (fold TOOL-PR54-4/5/6)                                  | CEFR count + quota constants + viewport fixtures                 |
| T14b-tests  | Error-state clears on retry (product)                                      | AGENTS.md UI state; optional Vitest, not new lint                |

### Backlog from PR #63 tooling review (2026-11-15)

Non-blocking for T15 merge; prioritize before T16+ writing surface. Full table: [T15 tooling review PR63](410db1e9-fbdb-4fff-af2c-e08e9cfe0a33).

| ID (draft)   | Rule / change                                           | Notes                                    |
| ------------ | ------------------------------------------------------- | ---------------------------------------- |
| TOOL-PR63-1  | Extend `word-target-single-source` + e2e                | `250–300 mots` in `prompt-sheet.spec.ts` |
| TOOL-PR63-2  | `generator-text-bounds-single-source`                   | 150/1500 in schema + system prompt       |
| TOOL-PR63-3  | `registre-enum-single-source`                           | `mixte` vs `mixt`                        |
| TOOL-PR63-4  | `no-arbitrary-tailwind-bracket`                         | `min-h-[54px]` (extends TOOL-PR62-1)     |
| TOOL-PR63-5  | E2e geometry + style probes (TOOL-PR57-1)               | `boundingBox`, opacity CSS               |
| TOOL-PR63-7  | `fake-ai-client-no-db`                                  | swap fixture via session count           |
| TOOL-PR63-8  | `ai-fixture-schema-ratchet`                             | fixture test filter split                |
| TOOL-PR63-9  | ESLint `no-magic-numbers` on contracts (TOOL-8)         | 150, 1500, quota in tests                |
| TOOL-PR63-15 | Quota literals in tests (fold TOOL-PR62-2, TOOL-PR54-6) | `DAILY_PROMPT_QUOTA` in tests            |

### Backlog from PR #65 tooling review (2026-11-16)

Non-blocking for T16 merge. Full proposals: [T16 tooling review PR #65](afb4227e-4d38-428b-9abe-b2219b5fd51d).

| ID (draft)  | Rule / change                                                                        | Notes                                                                                         |
| ----------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| TOOL-PR65-1 | `interactive-allowlist` ratchet test + drop knip ignore for `ui/textarea.tsx`        | PR adds `ruled-textarea` to `no-raw-interactive-element` ignores; prefer `src/components/ui/` |
| TOOL-PR65-2 | `no-shared-writing-busy` (ast-grep)                                                  | Same `$FLAG` on `GenerateButton` and `SubmitButton` / `WritingFooter.submitBusy`              |
| TOOL-PR65-3 | `word-count-single-source` + `word-band-numeric-single-source`; fold TOOL-PR63-1 e2e | `countWords` only; nudge `20/30/80` → `WORD_TARGET_BY_LEVEL`; extend e2e meter regex rule     |

### Backlog from PR #66 tooling review (2026-11-16)

Non-blocking for T17 merge. Prioritize TOOL-PR66-6 before T18. Full proposals: [T17 tooling review PR #66](4c1e91c3-026f-400a-98aa-afde4de90d8d).

| ID (draft)  | Rule / change                                                     | Notes                                                                   |
| ----------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| TOOL-PR66-1 | `saved-draft-single-source`                                       | Duplicate `{ text, savedAt }` vs `SavedDraft`                           |
| TOOL-PR66-2 | ESLint: no `zod` in `src/app/api/**/route.ts`                     | `DraftPutBody` in draft route                                           |
| TOOL-PR66-3 | `no-inline-test-response-schema`                                  | Draft route test shadows `DraftPutResponse`                             |
| TOOL-PR66-4 | `api-learner-copy-single-source` + `draft-text-max-single-source` | French errors in route; `20_001` vs `DRAFT_TEXT_MAX`                    |
| TOOL-PR66-5 | `no-zero-arg-date-in-components` + `timing-limits-single-source`  | `new Date()` / `LOCAL_MIRROR_MS` in autosave hook (TOOL-PR52-3)         |
| TOOL-PR66-6 | `no-parse-failure-default` + `prompt-level-is-cefr`               | `sessionStatus` defaults failed parse to `active` — land before T18     |
| TOOL-PR66-7 | `no-swallowed-fetch-in-components`                                | Autosave ignores `!result.ok`; land before T19                          |
| —           | Fold TOOL-PR57-1, TOOL-PR54-5 / TOOL-PR62-7                       | `boundingBox` in draft e2e; extra `test.use` viewports in `drafts.spec` |

### Backlog from PR #67 tooling review (2026-11-16)

Non-blocking for T18 merge. Prioritize TOOL-PR67-3 before T19. Full proposals: [T18 tooling review PR #67](5e42a007-12ee-4797-94e8-834ce82cedca).

| ID (draft)  | Rule / change                                                                 | Notes                                                                 |
| ----------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| TOOL-PR67-1 | `drizzle-orm` banned in route files; `no-raw-sql-transaction`                 | Prompt route opens transactions and re-queries active sessions        |
| TOOL-PR67-2 | `no-request-text-in-routes`                                                   | Empty POST bodies via `request.text()` + cloned `Request`             |
| TOOL-PR67-3 | `prompt-post-body-single-source`, `no-unparsed-error-code`, fetch error codes | `PromptPostBody` / `DraftWouldBeAbandonedResponse` duplicated on Home |
| TOOL-PR67-4 | `countdown-tick-single-source`, `no-silent-invalid-countdown`                 | `60_000` copied in notice, formatter, tests                           |
| —           | Folds TOOL-PR62-2, TOOL-PR63-15, TOOL-PR62-1, TOOL-PR54-5, TOOL-PR66-5/7      | Quota literals, bracket radii, e2e viewports, autosave `saveNow`      |

**Test review** (no blockers): [T18 test review PR #67](542b8902-0471-49f6-816b-2f8021a78221). Non-blocking: empty-swap quota `used + 1` in integration + e2e; 390 overflow asserts long copy before geometry; exhausted spec asserts label absent before prompt 3; evaluate-at-zero parses `EvaluatePostResponse` or re-reads `evaluated`.

**Adversarial** (blockers fixed pre-merge): [T18 adversarial PR #67](664a59c5-cd45-47df-b9b6-e409c6d2098e). Non-blocking product: `saveNow` on failed PUT (TOOL-PR66-7 / T19); transaction rollback vs quota lock; multi-`active` `replaceSessionId` semantics.

### Backlog from PR #68 tooling review (2026-11-16)

Non-blocking for T19 merge. Land **TOOL-PR68-1** and **TOOL-PR68-2** before T21. Full proposals: [T19 tooling review PR #68](0b74c861-e056-49fc-9c13-f3d900335097).

| ID (draft)  | Rule / change                                                | Notes                                                                  |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| TOOL-PR68-1 | `error-envelope-single-source`, `no-unwrapped-route-handler` | Mixed error shapes; `classifyFetchFailure` only hit from tests         |
| TOOL-PR68-2 | `no-erased-ai-error`, `no-error-message-sniff`               | `new Error("AI service error")`; `504 AI_TIMEOUT` never on real client |
| TOOL-PR68-3 | `no-animate-pulse`; e2e hung routes must not `route.abort`   | T19 removes pulse; offline spec aborts after 11s hides missing timeout |
| TOOL-PR68-4 | `no-connectivity-in-render`                                  | `useState(!navigator.onLine)` true on SSR; duplicate `online` listener |
| —           | Folds TOOL-PR62-1/3, PR57-1, PR54-5, PR62-2, PR66-*, PR67-3  | Brackets, copy, e2e geometry/viewports, draft route, flat error codes  |

### Backlog from PR #69 tooling review (2026-11-16)

Non-blocking for T20 merge. Land **TOOL-PR69-3** and **TOOL-PR69-4** with the next route/error ticket; **TOOL-PR69-8** before more `*-store` DB work.

| ID (draft)   | Rule / change                                                     | Notes                                                                                                              |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| TOOL-PR69-1  | `e2e-scenario-type-single-source`                                 | `E2eScenario` duplicated in `e2e/support/fixtures.ts` after `"advance"` added in `src/server/ai-client.ts`         |
| TOOL-PR69-2  | `e2e-advancement-copy-single-source`                              | `advancement.spec.ts` literals `Te voilà en B2.` / `Rester en B1` vs `homeCopy.advance*` in `src/copy/fr.ts`       |
| TOOL-PR69-3  | `api-learner-copy-single-source` (extends TOOL-PR66-4)            | `NO_LEVEL` + undo `NOT_FOUND`/`CONFLICT` French strings inline in route handlers                                   |
| TOOL-PR69-4  | `route-error-map-single-source` (extends TOOL-PR68-1)             | `level/undo/route.ts` hand-built `{ error: { code, message } }`; draft route already uses `DRAFT_ERRORS` map       |
| TOOL-PR69-5  | `advancement-streak-in-tests`                                     | `level-streak.test.ts` `toBe(3)` / `shouldPromote(3)` while production uses `ADVANCEMENT_STREAK` from `limits.ts`  |
| TOOL-PR69-6  | `no-shadowed-domain-helper-in-tests`                              | Test file redefines `shouldPromote` matching private `level-store` logic — export or assert via `recordEvaluation` |
| TOOL-PR69-7  | Widen `no-boolean-loading-state` → `*Busy` / `*busy` state names  | `home-page.tsx` `undoBusy` (+ `advancement-banner` `undoBusy` prop)                                                |
| TOOL-PR69-8  | `modules-*-store-db-allowlist` ratchet in `eslint-config.test.ts` | ESLint ignores `src/modules/**/*-store.ts` for `@/db`; `level-store.ts` is the new permanent coupling              |
| TOOL-PR69-9  | `level-since-epoch-single-source`                                 | Duplicated `1970-01-01T00:00:00.000Z` sentinel in `getStreakCount` / `recordEvaluation`                            |
| TOOL-PR69-10 | `no-raw-sql-in-e2e-seeds`                                         | `e2e/support/advancement-seed.ts` multi-table `client.execute` SQL                                                 |
| —            | Folds TOOL-PR62-1, TOOL-PR57-1, TOOL-PR54-5                       | `advancement-banner.tsx` `text-[18px]` / `px-[22px]`; `boundingBox` 44px; per-test `setViewportSize`               |

**Proposed snippets (not in repo yet)**

`e2e-scenario-type-single-source` — ESLint on `e2e/**`:

```js
"no-restricted-syntax": [
  "error",
  {
    selector:
      "TSTypeAliasDeclaration[id.name='E2eScenario']",
    message:
      "Import E2eScenario from src/server/ai-client; do not redefine scenario unions in e2e.",
  },
],
```

`e2e-advancement-copy-single-source` — ast-grep on `e2e/**`:

```yaml
id: e2e-advancement-copy-single-source
language: Tsx
severity: error
message: "Import homeCopy.advanceLead/advanceUndo (or a test helper) instead of hardcoding advancement strings."
rule:
  kind: string
  regex: "(?i)(Te voilà en |Rester en )"
files: ["e2e/**"]
ignores: ["e2e/support/**"]
```

`advancement-streak-in-tests` — ESLint override on `src/modules/cefr-tracker/**/*.test.ts`:

```js
"@typescript-eslint/no-magic-numbers": [
  "error",
  {
    ignore: [0, 1, 2],
    detectObjects: false,
    enforceConst: true,
    ignoreEnums: true,
    ignoreNumericLiteralTypes: true,
    ignoreReadonlyClassProperties: true,
    ignoreTypeIndexes: true,
  },
],
```

(Pair with `src/config/limits.contract.test.ts` asserting `ADVANCEMENT_STREAK === PLACEMENT_STEPS` only when product intends them equal.)

`no-boolean-loading-state` constraint widen:

```yaml
constraints:
  STATE:
    regex: "(?i)^(is)?(loading|busy|pending|submitting|generating|evaluating)$|(?i)busy$"
```

`level-since-epoch-single-source`:

```yaml
id: level-since-epoch-single-source
language: Tsx
severity: error
message: "Use LEVEL_STREAK_EPOCH (src/lib/dates.ts or src/config) instead of an inline 1970 sentinel."
rule:
  kind: string
  regex: '^"1970-01-01'
files: ["src/**"]
ignores: ["src/lib/dates.ts", "src/config/**"]
```

**Adversarial / test hooks (no new lint):** undo HTTP `409`/`404` covered only in `level-store.test.ts`, not `level/undo/route.test.ts`; ticket C2 no-promotion unit test absent (`recordEvaluation` at C2); e2e does not assert immediate post-evaluate banner before `loadToday` completes (relies on second fetch). Optional: export `shouldPromote` for tests instead of shadowing.

**Already enforced / positive:** `ADVANCEMENT_STREAK` in `level-store.ts`; `LevelChangeDto` / `LevelUndoBody` in `@/contracts`; `tracker-store` / `CefrTracker` deleted; `placement` source integration test; `NO_LEVEL` integration test; component copy via `homeCopy`; `fake` `advance` scenario + validated `evaluation.b2.json` fixture.

### PR #70 (T21a — corrections table + parser)

Non-blocking for T21a merge. Land **TOOL-PR70-1**, **TOOL-PR70-2**, **TOOL-PR70-3**, and **TOOL-PR70-5** before **T21b** (`chatCompletionJSON` + persist).

| ID (draft)   | Rule / change                                              | Notes                                                                                                   |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| TOOL-PR70-1  | `output-schema-strict-nullable`                            | `EvaluatorOutputSchema` / `EvaluationV2` use `z.object`; AC omits `additionalProperties: false` ratchet |
| TOOL-PR70-2  | `EVALUATOR_CORRECTIONS_MAX` + contracts `no-magic-numbers` | `.max(15)` in `evaluation.ts`; folds TOOL-PR63-9                                                        |
| TOOL-PR70-3  | `Dimension` enum single-source                             | Four dimension keys repeated; backend §1 `Dimension`                                                    |
| TOOL-PR70-4  | Export v2 `DimensionScore` shape                           | `DimensionScore` alias still legacy `{max}`; T21b import trap                                           |
| TOOL-PR70-5  | LLM `category` → `MistakeCategory.nullable()`              | `z.string().nullable()` allows invented IDs at Structured Outputs boundary                              |
| TOOL-PR70-6  | `countsAsMistake` exhaustive `switch`                      | Boolean-or; History `if/else if` on parse status misses future variants                                 |
| TOOL-PR70-7  | `no-in-operator-schema-narrowing`                          | `toPlaceholderEvaluation` uses `"tips" in` / `"version" in`                                             |
| TOOL-PR70-8  | Kind/status/anchor `as const` IDs                          | Inline `z.enum([...])`; T21b prompt will copy strings                                                   |
| TOOL-PR70-9  | 1-based ints `.positive()`                                 | `occurrence`, `ordinal`, `sessionId` unbounded `.int()`                                                 |
| TOOL-PR70-10 | DB text enums + JSON columns parse on read                 | `corrections` raw `text()` columns; land with T21b persist                                              |

**Proposed snippets (not in repo yet)**

`no-optional-in-output-schema` (ast-grep on evaluation/output contracts):

```yaml
id: no-optional-in-output-schema
language: Tsx
severity: error
message: "LLM *OutputSchema must use .nullable(), never .optional()."
rule:
  pattern: $X.optional()
files: ["src/contracts/evaluation.ts", "src/contracts/**/*output*"]
```

`countsAsMistake` exhaustive switch (reference for TOOL-PR70-6):

```ts
export function countsAsMistake(
  c: Pick<Correction, "kind" | "status">,
): boolean {
  switch (c.kind) {
    case "mistake":
      return c.status !== "overturned";
    case "standard":
      return false;
    case "dialect_check":
      return c.status === "confirmed_mistake";
  }
}
```

**Already enforced / positive:** `parseJson` in `parseStoredEvaluation`; `EVALUATION_SCORE_MAX`; `MISTAKE_CATEGORY_IDS` + `z.enum`; omitted-nullable parse test; malformed → unreadable in History.

### PR #71 (T21b — evaluator runtime)

Non-blocking for T21b merge. **TOOL-PR70-1/2/3/5 partially landed in product** (not full ratchets). Land **TOOL-PR71-1**, **71-2**, **71-3**, and remaining **70-7/8/10** before **T22**.

**TOOL-PR70 status on T21b**

| ID    | Status  | Notes                                                                                    |
| ----- | ------- | ---------------------------------------------------------------------------------------- |
| 70-1  | Partial | `z.strictObject` on evaluator output; `Correction` still `z.object`; no ast-grep ratchet |
| 70-2  | Partial | `EVALUATOR_CORRECTIONS_MAX`; contracts `no-magic-numbers` still off                      |
| 70-3  | Landed  | `DIMENSION_IDS` + `Dimension` on output; legacy v1 lists still manual                    |
| 70-4  | Open    | `DimensionScore` still legacy `{max}`; dodged via `toPlaceholderEvaluation`              |
| 70-5  | Partial | LLM `MistakeCategory.nullable()`; fixture draft schema still accepts loose `category`    |
| 70-6  | Open    | `countsAsMistake` boolean-or; History `if/else if` on parse status                       |
| 70-7  | Open    | `"tips" in` / `"version" in` on Home submit + Placement                                  |
| 70-8  | Open    | Inline kind enums; prompt copies string literals                                         |
| 70-9  | Open    | Unbounded `.int()` on occurrence/ordinal/sessionId                                       |
| 70-10 | Open    | `saveCorrections` raw `text()` columns; parse-on-read in T22                             |

| ID (draft)  | Rule / change                                  | Notes                                                                 |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| TOOL-PR71-1 | `no-parallel-llm-schema`                       | `EvaluatorOutputDraft` / fixture schema bypasses strict LLM envelope  |
| TOOL-PR71-2 | `chatCompletionJSON` returns `{ value, text }` | `evaluation_raw` from re-stringified parse, not model text            |
| TOOL-PR71-3 | `no-cloned-request-in-routes`                  | Session route `new Request` into evaluate alias; fold TOOL-PR67-2     |
| TOOL-PR71-4 | Prompt constants + kind IDs (fold 70-8)        | Limits/prompt version in config; interpolate `CorrectionKind.options` |
| TOOL-PR71-5 | `no-fs-in-modules` for prompt load             | `fs.readFileSync` for evaluator prompt body                           |
| TOOL-PR71-6 | `LocatedQuote` uses `CorrectionAnchor`         | Local `"exact" \| "normalized"` union                                 |
| TOOL-PR71-7 | `ai-fixture-schema-ratchet` (fold TOOL-PR63-8) | v2 fixtures vs v1 `Evaluation` ratchet mismatch                       |
| TOOL-PR71-8 | `OpenAiClientLike` single-source               | Duplicated in prompt-generator + writing-evaluator                    |
| TOOL-PR71-9 | Evaluate errors + `now`                        | Mixed error shapes; `new Date()` in handler; fold TOOL-PR68/69/66     |

**Proposed snippet (71-3)**

```yaml
id: no-cloned-request-in-routes
language: Tsx
severity: error
message: "Routes call a module; do not new Request() another handler."
rule:
  pattern: new Request($URL, $INIT)
files: ["src/app/api/**"]
```

**Already enforced / positive:** `chatCompletionJSON` + `parseJson`; `Correction.parse` in post-process; `EvaluatePostResponse` `z.strictObject`; injected `now` / `createId`; fake client `parseJson`.

### PR #73 (T22a — Phase C marked text + Mistake cards)

Non-blocking for T22a merge. Priority **TOOL-PR73-1** / **73-2** before **T22b** (restore, Compris persist).

**Hook isolation (`c71bb5f`, `f7e7e313`):** pre-push `GIT_DIR` made nested `git init` in `pr-size.integration.test.ts` hit this repo. The PR wraps those tests in `withoutHookGitEnv` and strips `GIT_*` in `lefthook.yml` — same four keys in two places; `lefthook-hooks.test.ts` still inherits hook env.

| ID (draft)  | Rule / change                                      | Notes                                                                                                                            |
| ----------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| TOOL-PR73-1 | `hook-git-env-isolation`                           | Vitest setup unsets `GIT_DIR` / `GIT_WORK_TREE` / `GIT_INDEX_FILE` / `GIT_PREFIX`; share key list with lefthook                  |
| TOOL-PR73-2 | `no-boolean-loading-state` (fold TOOL-PR69-7)      | `home-page.tsx` parallel `useState(false)` beside `submitUi` union; land before T22b restore                                     |
| TOOL-PR73-3 | `surface-padding-single-source`                    | `correction-card.tsx` `p-[16px_18px]`; `review-screen.tsx` `max-sm:p-[22px_18px_26px]` — use Surface `card` / `mobile-review`    |
| TOOL-PR73-4 | `no-arbitrary-tailwind-bracket` (fold TOOL-PR62-1) | `marked-text.tsx` / `correction-card.tsx` / `prompt-sheet.tsx`; extend `theme.test.ts` for `max-w-review`, `text-writing-marked` |
| TOOL-PR73-5 | `sm-breakpoint-single-source`                      | Literal `min-width: 640px` in `review-screen.tsx`, `ruled-textarea.tsx`, `setup-dom.ts`                                          |
| TOOL-PR73-6 | `review-copy-single-source` (fold TOOL-PR62-3)     | Inline `"1 faute"` / `"en français standard"` in copy + e2e                                                                      |
| TOOL-PR73-7 | Kind → summary counts (fold TOOL-PR70-6)           | Exhaustive kind switch; `countsAsMistake` for fautes in `copy/review.ts`                                                         |
| TOOL-PR73-8 | `no-getelementbyid-in-components`                  | Compris focus via `document.getElementById` in `review-screen.tsx`                                                               |

**Folds:** e2e `boundingBox` (TOOL-PR57-1); viewport `test.use` (TOOL-PR54-5 / 62-7).

**70-10 partial:** `EvaluatePostResponse.corrections` is `z.array(Correction)`; DB parse-on-read and `/api/today` restore remain **T22b**.

**Already good:** `reviewCopy`; `Button` for Compris; tokens `--container-review`, `--text-prompt-review`, `--text-writing-marked`, `--radius-marker`; `submitUi` union; UI evidence in PR body.

### PR #74 (T22b — CECR scores, Compris persist, Phase C restore)

Non-blocking for T22b merge. Land **TOOL-PR74-1** before T23/T25 (more `PATCH /api/corrections`). Land remaining **73-2** with the next Home state ticket.

**TOOL-PR73 status on T22b**

| ID    | Status  | Notes                                                                                                                                                          |
| ----- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 73-1  | Open    | Not in this PR.                                                                                                                                                |
| 73-2  | Partial | `inReview = reviewing \|\| phase?.kind === "C-review"`; `useState(false)` `reviewing` still sits beside `submitUi`. Fold TOOL-PR69-7.                          |
| 73-3  | Open    | Unchanged Surface paddings.                                                                                                                                    |
| 73-4  | Open    | Worse: `scores-disclosure.tsx` `px-[18px]`, `text-[15px]`, `text-[11px]`, `p-[14px_16px]`, `tracking-[0.08em]`, `calc(100%+6px)`. Fold TOOL-PR62-1 / 63-4.     |
| 73-5  | Open    | `matchMedia("(min-width: 640px)")` unchanged.                                                                                                                  |
| 73-6  | Partial | Score labels live in `reviewCopy`; e2e still hardcodes `Scores ▸` / `Ensemble : B1` / `Grammaire` / `A2+` / `Pour monter`. Summary French still inline.        |
| 73-7  | Open    | `formatEvaluationSummary` `else` still counts unknown kinds as dialect.                                                                                        |
| 73-8  | Open    | Compris still focuses via `document.getElementById`.                                                                                                           |
| 70-10 | Partial | `correctionFromRow` + `Correction.safeParse`; failed rows dropped; `resourceIds` parse fail → `[]`; `isFocus: false` reconstructed; DB columns still `text()`. |

| ID (draft)  | Rule / change                                                 | Notes                                                                                                       |
| ----------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| TOOL-PR74-1 | `no-void-fetchjson` (fold TOOL-PR66-7)                        | `void fetchJson` on Compris; optimistic `ackedIds` survives a failed PATCH until reload                     |
| TOOL-PR74-2 | `CefrSubLevel` + `SCORE_TO_CECR_SUBLEVEL` ratchet             | Mapping returns `string`; keys 1–6 not tied to `EVALUATION_SCORE_MAX`; no `A2+` / `B1+` enum                |
| TOOL-PR74-3 | `no-silent-safeparse-drop` (finish TOOL-PR70-10)              | `listCorrectionsForSession` skips bad rows; `resourceIdsJson` fail → `[]`; AGENTS.md wants an inline notice |
| TOOL-PR74-4 | `CORRECTION_ERRORS` map (fold TOOL-PR69-3 / 69-4)             | French `NOT_FOUND` / `CONFLICT` inline in `corrections/[id]/route.ts` like undo, unlike `DRAFT_ERRORS`      |
| TOOL-PR74-5 | `TodayReviewSession` / `ReviewScreen.evaluation` required     | Nested `z.object`; `evaluation` nullable + `evaluation = null` default hides Scores                         |
| TOOL-PR74-6 | `no-zero-arg-date-in-routes` (fold TOOL-PR66-5 / TOOL-PR71-9) | `setCorrectionStatus(id, next.status, () => new Date())`                                                    |
| TOOL-PR74-7 | `collapsible-trigger-uses-button` (extend TOOL-PR65-1)        | `Collapsible.Trigger` is a native `<button>`; `no-raw-interactive-element` only matches the `button` tag    |
| —           | Fold TOOL-PR73-2/4/6/8, TOOL-PR57-1, TOOL-PR54-5              | Dual `reviewing` flag; new bracket tokens; e2e copy; `getElementById`; `boundingBox`; `test.use` viewports  |

**Proposed snippets (not in repo yet)**

`no-void-fetchjson` — ESLint on `src/components/**`:

```js
"no-restricted-syntax": [
  "error",
  {
    selector:
      "UnaryExpression[operator='void'] > CallExpression[callee.name='fetchJson']",
    message:
      "Handle FetchJsonResult (ok / error). Do not void fetchJson — Compris and autosave must not look saved when PATCH/PUT failed.",
  },
],
```

`CefrSubLevel` ratchet — `src/contracts/cefr.ts` + `src/config/limits.contract.test.ts`:

```ts
export const CEFR_SUB_LEVELS = ["A1", "A2", "A2+", "B1", "B1+", "B2"] as const;
export const CefrSubLevel = z.enum(CEFR_SUB_LEVELS);
export type CefrSubLevel = z.infer<typeof CefrSubLevel>;

export const SCORE_TO_CECR_SUBLEVEL = {
  1: "A1",
  2: "A2",
  3: "A2+",
  4: "B1",
  5: "B1+",
  6: "B2",
} as const satisfies Record<1 | 2 | 3 | 4 | 5 | 6, CefrSubLevel>;

// test: Object.keys(SCORE_TO_CECR_SUBLEVEL).length === EVALUATION_SCORE_MAX
// and cefrSubLevelFromScore returns CefrSubLevel | null
```

`no-silent-safeparse-drop` — ast-grep on stores:

```yaml
id: no-silent-safeparse-drop
language: Tsx
severity: error
message: "A failed safeParse in a list must surface an inline notice (AGENTS.md); do not skip the row or default the field."
rule:
  any:
    - pattern: $PARSED.success ? $PARSED.data : null
    - pattern: resourceIds.ok ? resourceIds.value : []
files: ["src/modules/**", "src/server/**"]
```

`no-zero-arg-date-in-routes`:

```yaml
id: no-zero-arg-date-in-routes
language: Tsx
severity: error
message: "Inject now: () => Date from the handler seam; do not call new Date() in src/app/api."
rule:
  pattern: new Date()
files: ["src/app/api/**"]
```

`collapsible-trigger-uses-button`:

```yaml
id: collapsible-trigger-uses-button
language: Tsx
severity: error
message: "Collapsible.Trigger must render the Button primitive (render={Button} or equivalent)."
rule:
  pattern: <Collapsible.Trigger $$$>
  not:
    has:
      kind: jsx_attribute
      regex: "render"
files: ["src/components/**"]
ignores: ["src/components/ui/**"]
```

**Already enforced / positive:** `CorrectionPatchBody` / `CorrectionPatchResponse` `z.strictObject`; `parseRequestBody` + `withErrors`; `DIMENSION_IDS` drives score rows; `reviewCopy` for Q5 labels / `Pour monter`; `parseStoredEvaluation` on `/api/today` restore; `Correction.safeParse` on read; `acknowledgeCorrection` kind/status gate; UI evidence blob URLs on the PR branch.

### PR #75 (T23 — Standard→Louisiana suggestions)

Non-blocking for T23 merge. Land **TOOL-PR75-1** and **TOOL-PR75-2** before T25.

| ID (draft)  | Rule / change                           | Notes                                                                                                                                                                                   |
| ----------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TOOL-PR75-1 | `no-correction-kind-if`                 | `markClass` / `markerClass` fall through to Faute styles; `CorrectionCard` special-cases `standard` then treats other kinds as `<div>`; summary `else` counts unknown kinds as dialect. |
| TOOL-PR75-2 | `no-parallel-marked-kind`               | `type MarkedKind = "mistake" \| "standard"` beside `CorrectionKind`.                                                                                                                    |
| TOOL-PR75-3 | `no-strike-in-standard-arm`             | `<s>` only inside `case "standard"` (ships with 75-1 when switch exists).                                                                                                               |
| TOOL-PR75-4 | `review-copy-single-source` (fold 73-6) | `français standard`, summary line, `Compris` retyped in copy tests and e2e; keep `review.test.ts` golden.                                                                               |
| TOOL-PR75-5 | Review `no-arbitrary-tailwind-bracket`  | Outlined marker `px-[5px]` / card pill `px-[7px]`; delete slice when TOOL-PR73-4 lands.                                                                                                 |

**Folds:** `E2eScenario` `"standard"` duplicated in `ai-client.ts` and `e2e/support/fixtures.ts` (TOOL-PR69-1, open).

### PR #76 (T24 — DLF lexicon)

Non-blocking for T24 merge. Prioritize **TOOL-PR76-4** and **TOOL-PR76-5** before first lexicon Release ([DLF-extract#41](https://github.com/logandelafosse/DLF-extract/issues/41)).

| ID (draft)  | Rule / change                                   | Notes                                                                                                  |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| TOOL-PR76-1 | `no-client-lexicon-json` + ESLint probe restore | Ban client `lexicon.json` imports; restore dropped `eslint-config.test.ts` case for `@/modules/dlf/*`. |
| TOOL-PR76-2 | `modules-fs-server-allowlist`                   | Only `src/modules/dlf/load.ts` may import `node:fs` / `server-only` from modules.                      |
| TOOL-PR76-3 | `dlf-attribution-single-source`                 | `DlfAttribution` Zod in `contracts/dlf.ts`; no parallel object types.                                  |
| TOOL-PR76-4 | `dlf-fetch-validates-artifact`                  | `scripts/dlf-fetch.ts` must parse `DlfLexicon`; semver + auth for private releases.                    |
| TOOL-PR76-5 | `dlf-version-pin-tracked`                       | `.gitignore` vs docs on committing `src/data/dlf/version`; align pin story.                            |
| TOOL-PR76-6 | `dlf-fixture-path-single-source`                | Literal fixture path repeated in configs/tests/scripts.                                                |
| TOOL-PR76-7 | `dlf-limits-single-source`                      | Token estimate and plural min in `lookup.ts` instead of `src/config`.                                  |
| TOOL-PR76-8 | `e2e-dlf-copy-single-source`                    | Hardcoded DLF strings in `e2e/dlf-badge.spec.ts`.                                                      |
| TOOL-PR76-9 | `no-dlf-extract-sibling-path`                   | `verify-dlf-seed.ts` still reads `../DLF-extract`.                                                     |

**Already good:** `server-only` loader; suggestion-only DLF attribution after `4a589f0`; hint caps in `limits.ts`; badge via `reviewCopy` + `<abbr>`.

### PR #77 (T25a — dialect server slice)

Non-blocking for T25a merge. Land **TOOL-PR77-1**–**77-4** before T25b.

| ID (draft)  | Rule / change                             | Notes                                                                       |
| ----------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| TOOL-PR77-1 | `no-raw-sql-transaction`                  | Prefer `db.transaction()` over raw `BEGIN`/`COMMIT` (fixed race `334ac23`). |
| TOOL-PR77-2 | `dialect-note-rule-bounds-single-source`  | Zod + store both bound `rule`; validation copy skew on max length.          |
| TOOL-PR77-3 | `learner-dialect-note-single-source`      | Parse `scope` from DB; avoid silent `pattern` → `word`.                     |
| TOOL-PR77-4 | `word-scope-match-is-normalized-equality` | Substring `includes` on short lemmas over-suppresses.                       |
| TOOL-PR77-5 | `quote-normalize-single-source`           | Duplicate NFC/normalize beside `locate-quote`.                              |
| TOOL-PR77-6 | `no-default-null-on-dialect-fields`       | Evaluator keys vs T25b pattern radio.                                       |
| TOOL-PR77-7 | `correction-patch-action-single-source`   | Exhaustive switch on `CorrectionPatchAction`.                               |

### PR #78 (T25b — dialect review UI)

Non-blocking for T25b merge. Prioritize **TOOL-PR78-1** and **TOOL-PR78-2** before T26.

| ID (draft)  | Rule / change                           | Notes                                                                |
| ----------- | --------------------------------------- | -------------------------------------------------------------------- |
| TOOL-PR78-1 | `async-ui-error-payload`                | In-sheet errors after `d66ed56`; ratchet bare `{ status: "error" }`. |
| TOOL-PR78-2 | `no-raw-fetch-body`                     | Raw `JSON.stringify` on dialect-note and PATCH bodies.               |
| TOOL-PR78-3 | `dialect-note-from-correction-response` | Optional `correction` on create response.                            |
| TOOL-PR78-4 | `fake-ai-fixture-map`                   | Scenario + SQL fixture picking in fake AI client.                    |
| TOOL-PR78-5 | `e2e-reset-table-coverage`              | `dialect_notes` DELETE in reset-db.                                  |
| TOOL-PR78-6 | `review-copy-literal-ratchet`           | Hardcoded French in e2e/sheet tests.                                 |
| TOOL-PR78-7 | `evaluator-fixture-directory-ratchet`   | New `ok-dialect-*.json` fixtures.                                    |
| TOOL-PR78-8 | `dialog-close-uses-button`              | Native `Dialog.Close`.                                               |
| TOOL-PR78-9 | `correction-card-actions-required`      | Optional action callbacks on cards.                                  |

### Session retro (T23–T27, 2026-11-16)

Full write-up: `docs/agents/session-retro.md`. Prioritize **TOOL-SESSION-1**–**4** before the next review-heavy e2e wave.

| ID             | Pri | Summary                                                                        |
| -------------- | --- | ------------------------------------------------------------------------------ |
| TOOL-SESSION-1 | P0  | `writingField` + ban substring `getByLabel('Ton texte')` in e2e                |
| TOOL-SESSION-2 | P0  | Skip e2e on docs-only `main` push                                              |
| TOOL-SESSION-3 | P0  | No network fetch in lefthook schema test                                       |
| TOOL-SESSION-4 | P0  | `npm run dev` / migrate without requiring OpenAI for local DB                  |
| TOOL-SESSION-5 | P1  | Lefthook docs-only pre-push skip                                               |
| TOOL-SESSION-6 | P1  | `ticket-worktree` script                                                       |
| TOOL-SESSION-7 | P1  | `pr:size` top files + split thresholds                                         |
| TOOL-SESSION-8 | P1  | Document diff-scoped review briefs in workflow; GitHub PR comment for blockers |
| TOOL-SESSION-9 | P2  | Export TZ regression test                                                      |
