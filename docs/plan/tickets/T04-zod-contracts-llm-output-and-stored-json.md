# T04 — Zod contracts for LLM output and stored JSON

GitHub issue: #6

| Phase | Type | Blocked by | Production lines (est.) |
| ----- | ---- | ---------- | ----------------------- |
| 0     | AFK  | T02        | ~300                    |

## User stories

- As Logan, I want History to keep working when one past session has unreadable data, so that one bad row never blanks my whole History.
- As Logan, I want a malformed Evaluation from the model to show a retryable error, so that I can submit again instead of hitting a crash.
- As an agent implementing a ticket, I want one schema per shape with types derived from it, so that I never keep a TS interface, a prompt description and a runtime check in sync by hand.

## What to build

Add `zod` (^4) as a direct dependency and create `src/contracts/`, which imports only `zod`:

- `cefr.ts`: `CEFR_LEVELS`, the `CefrLevel` schema and type, and a level order derived from the array index. This replaces both hand-written `CefrLevel` unions and `CEFR_ORDER`.
- `evaluation.ts`: the current Evaluation shape (four dimensions, `overall_cefr`, tips). It is Structured-Outputs friendly: every field is required, and absent values are `nullable`, never `optional`.
- `prompt.ts`: stored `PromptConstraints`.
- `session.ts`: the session view returned to the client.

`src/lib/json.ts` exports `parseJson(Schema, text)`, which returns a Result and never throws. It is the only place in `src/` that calls `JSON.parse`.

**LLM boundary.** `chatCompletionJSON(Schema, params)` sends the schema as a strict `json_schema` response format, either via `zodResponseFormat` or via `z.toJSONSchema()` if the bundled helper rejects Zod 4. It validates the reply and throws `AiOutputError` with code `invalid_json` or `schema_mismatch`, keeping the original error as `cause`. The evaluator system prompt no longer describes the JSON shape in prose. `POST /api/evaluate` maps `AiOutputError` to a 502 JSON response the UI can retry, and the session is not marked evaluated.

**Stored JSON.** The history store parses `evaluation_json` and `prompt_constraints` on read. Text enum columns (`cefr_level`, `level_changes.to_level`, `source`) go through their schemas. `GET /api/sessions` returns:

```ts
type SessionView = {
  id: number;
  createdAt: string;
  promptText: string;
  writingText: string | null;
  promptLevel: CefrLevel | null; // null when prompt_constraints is unreadable
  evaluation:
    | null
    | { ok: true; value: Evaluation }
    | { ok: false; reason: "unreadable" };
};
```

The History page stops parsing strings. A row with `evaluation.ok === false` still shows its Writing Prompt and Student Writing, plus the inline notice from the copy table (`row.malformed.notice`): _Les corrections de cette séance ont pas pu être relues. Ta consigne et ton texte sont gardés, et le reste de l'Historique marche comme d'habitude._ `POST /api/evaluate` reads stored constraints through `parseJson` too. When they are unreadable, it falls back to the session's `cefr_level`.

## Acceptance criteria

- [ ] `[unit]` `chatCompletionJSON` given non-JSON text throws `AiOutputError` with code `invalid_json`. Given valid JSON missing `overall_cefr`, it throws `schema_mismatch`. Both keep `cause`.
- [ ] `[integration]` `POST /api/evaluate` with a fake client that returns malformed output responds 502 with a JSON body, and the session's `evaluation_json` stays null.
- [ ] `[unit]` The request sent by the evaluator carries a `json_schema` response format, and its system prompt contains no `"overall_cefr"` field description.
- [ ] `[integration]` A test DB seeded with the real residue row (`evaluation_json = '{"score": 5}'`, `prompt_constraints = '{}'`), plus one valid row and one `"{oops"` row, makes `GET /api/sessions` return 3 views: 1 `ok: true`, 2 `ok: false`, and `promptLevel: null` for the `{}` row.
- [ ] `[integration]` The History page given those 3 views renders all 3 rows. The 2 unreadable rows show their prompt text and the malformed notice, and nothing throws.
- [ ] `[unit]` Every `*.valid.json` under `src/test/fixtures/ai/` parses with its schema, and every `*.invalid.json` fails.
- [ ] `[check]` `rg -n 'type CefrLevel\s*=' src` matches only `src/contracts/`; `rg -n 'as CefrLevel|JSON\.parse' src --glob '!**/*.test.*'` matches only `src/lib/json.ts`.
- [ ] `[check]` `zod` appears under `dependencies` in `package.json`; `npm run check` exits 0.

## Tests to write first

1. Malformed model output becomes `AiOutputError` (`invalid_json` and `schema_mismatch`).
2. The evaluate route returns 502 and leaves the session unevaluated.
3. The sessions route returns one view per row, whatever the stored shape.
4. The History page renders unreadable rows with the notice.
5. AI fixtures validate against their schemas.

## Out of scope

- Request body schemas, `fetchJson`, and `env.ts` (T05).
- The repair retry and SDK error-code mapping (timeout, 429, 401) (T21).
- Evaluation v2 with Corrections and `dataIssues` for v1 rows (T21, T31).
- The History redesign (T31). Only the notice is added here.
- The ast-grep `no-json-parse` and `no-type-assertion` rules (T07).

## References

- `docs/agents/tooling-review.md` §5 (table and `src/contracts` example) and §12 TOOL-4.
- `docs/plan/backend-requirements.md` §0 D3, D13, D14; §1 (three boundaries); §2.3 (malformed `evaluation_json`); §4.1 `completeJSON` steps 1–3.
- `docs/design/implementation-map.md` §4.8 and §5 History copy (`row.malformed.notice`).
