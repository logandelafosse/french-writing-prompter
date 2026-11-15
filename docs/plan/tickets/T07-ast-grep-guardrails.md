# T07 — ast-grep guardrails

| Phase | Type | Blocked by | Production lines (est.)                                                       |
| ----- | ---- | ---------- | ----------------------------------------------------------------------------- |
| 0     | AFK  | T06        | ~40 in `src` (import paths after the legacy move); ~400 YAML rules and config |

## User stories

- As an agent implementing a ticket, I want every known defect (unvalidated `JSON.parse`, UTC date keys, copy-pasted dialect rules, raw colours, raw `<button>`s) to fail `npm run check` with a message that tells me the right helper, so that I fix it before review instead of after.
- As Logan as maintainer, I want the legacy UI fenced into one directory, so that the new-UI rules can be strict today and the exception list shrinks to nothing as redesign tickets delete legacy files.

## What to build

ast-grep becomes a first-class check. `@ast-grep/cli` is a devDependency and every script calls the `ast-grep` binary, never `sg` (on this machine `/usr/bin/sg` is shadow-utils). `sgconfig.yml` sits at the repo root with rules in `tooling/ast-grep/rules/` and rule tests in `tooling/ast-grep/tests/`, laid out as in `tooling-review.md` §4 (including the `languageGlobs` entry that parses `.ts` as TSX).

All P0 rules from §4 land, each with a test that has at least one `valid` and one `invalid` snippet so a rule can't silently match nothing: `no-json-parse`, `no-raw-json-body`, `no-utc-date-key`, `no-adhoc-date-format`, `no-app-db-in-tests`, `dialect-rules-single-source`, `dialect-id-single-source`, `no-raw-interactive-element`, `no-raw-color`, `no-raw-color-css`, `no-tailwind-default-palette`, `no-boolean-loading-state`, `no-process-env`, `no-inline-model-name`. Rule `files`/`ignores` point at the real single-source modules T04–T06 created (`src/lib/json.ts`, `src/lib/http/**`, `src/lib/dates.ts`, `src/modules/dialect/**`, `src/server/env.ts`, `src/config/**`); if a path differs from §4, the rule follows the code, not the doc.

`no-scaffold-leftovers` is added by whichever of T07 and T09 merges second (Geist and "Create Next App" are still in `layout.tsx` until T09).

The legacy UI moves with `git mv` (so rename detection keeps the diff small) into `src/components/legacy/`: `history/`, `level/`, `placement/`, `prompt/`, and the inline JSX of `src/app/page.tsx`, which becomes a thin wrapper around a legacy home component. UI rules ignore `src/components/legacy/**` and nothing else. If T09 has not merged, the shadcn scaffold colour variables in `globals.css` move verbatim into `src/styles/tokens.css` (the one file `no-raw-color-css` exempts); T09 then replaces them.

`npm run lint:ast` (`ast-grep scan && ast-grep test --skip-snapshot-tests`) is added to `check`. Suppression is `// ast-grep-ignore: <rule-id>` followed by a reason; reviewers reject bare suppressions.

P1 rules from §4 (`no-type-assertion`, `no-mocking-own-modules`) are in scope only if `npm run pr:size` stays under budget; otherwise note them on the board card for the coordinator. `no-direct-ai-client` belongs to T11.

**From T02 tooling review (PR #39):** widen `no-utc-date-key` for `indexOf/split("T")` date extraction and `utcDateKey`-named helpers; add `no-skip-undefined-element` (`if ($EL === undefined) continue`); add `no-interpolated-exec` on `execSync(\`...\`)` in `scripts/**` and `tooling/**`.

**From T04 tooling review (PR #41):** widen `no-json-parse` (optional chaining, `JSON["parse"]`, destructuring, `globalThis`, `eval`/`Function`); add `no-permissive-boundary-schema` (`z.any`, `z.json`, etc.); widen `no-raw-json-body` (`request["json"]()`, destructuring); switch fixture tests from raw `JSON.parse` to `parseJson`.

## Acceptance criteria

- [ ] `[check]` `npx ast-grep --version` prints the ast-grep version from `node_modules`; `package.json` scripts never invoke `sg`.
- [ ] `[check]` `npm run lint:ast` exits 0 and is part of `npm run check`.
- [ ] `[check]` Every file in `tooling/ast-grep/rules/` has a matching test in `tooling/ast-grep/tests/` with ≥ 1 `valid` and ≥ 1 `invalid` case; `ast-grep test` reports them all passing.
- [ ] `[check]` In a scratch file under `src/`, each of these makes `npm run check` fail with the rule's message: `JSON.parse(x) as T`; `new Date().toISOString().split("T")[0]`; `await request.json()`; `process.env.OPENAI_API_KEY`; the string `"louisiana"`; the string `"gpt-4o"`; `"#ff0000"` in a TSX string; `bg-zinc-900` in a className; `const [loading, setLoading] = useState(false)` in a `.tsx`; a raw `<button>` in `src/components/home/`.
- [ ] `[check]` A scratch `*.test.ts` that imports `@/db` fails `no-app-db-in-tests`.
- [ ] `[check]` A raw `<button>` or `bg-zinc-*` inside `src/components/legacy/` passes; the same inside `src/components/ui/` passes only for `no-raw-interactive-element`.
- [ ] `[check]` `ls src/components` shows only `legacy/` and `ui/` (plus anything T04–T06 added that isn't legacy UI); `src/app/page.tsx` contains no Tailwind palette classes.
- [ ] `[check]` `npm run build` succeeds and `npm run dev` renders Home and History unchanged (manual; the e2e harness arrives in T11).
- [ ] `[check]` `npm run check` is green.

## Tests to write first

ast-grep rule tests are the failing tests here: write the `tooling/ast-grep/tests/<rule>-test.yml` file (valid + invalid cases from the defect that motivated the rule) before the rule YAML, run `ast-grep test`, watch it fail, then write the rule.

- `no-json-parse`: rejects `JSON.parse(text) as Evaluation`; accepts `parseJson(Schema, text)`.
- `no-utc-date-key`: rejects `.toISOString().split(...)` and `.slice(0, 10)`; accepts a bare `toISOString()` timestamp (example in §4).
- `no-raw-json-body`: rejects `await res.json()`; accepts `NextResponse.json(body)`.
- `dialect-rules-single-source`: rejects `"eux-autre"` in a prompt string; accepts it only via the file glob for `src/modules/dialect/**` (exercise with a second test case or document why ignores can't be tested).
- `no-boolean-loading-state`: rejects `isLoading`/`generating` booleans; accepts a union-typed `status` state.
- One test file per remaining rule, same pattern.

## Out of scope

- ESLint changes, AGENTS.md rules (T08).
- Real design tokens and Geist removal (T09).
- `no-direct-ai-client` and the fake AI client (T11).
- Pre-commit hooks (T12).
- Deleting legacy components (each redesign ticket deletes what it replaces; T35 finishes).

## References

- `docs/agents/tooling-review.md` §4 (layout, every rule YAML, rule test example), §6 (`lint:ast` script), §12 TOOL-7.
- `docs/design/implementation-map.md` §2.10 (which legacy files the redesign replaces).
- `CONTEXT.md` (Louisiana French terms the dialect rule matches).
