# Backend, data & LLM requirements for the UI redesign

Status: proposal · Date: 2026-11-14 · Target UI: `docs/design/handoff/HANDOFF.md`

This document lists the server, data and LLM changes needed for the redesign, and the fixes for known defects. Each section ties back to a vertical slice in §7. Domain terms follow `CONTEXT.md`. New terms this plan introduces (Correction, Mistake, Standard→Louisiana suggestion, Dialect check, Dialect Note, Weakness, Focus, Resource, Draft, Carnet) need to be added to `CONTEXT.md` in the slices that introduce them. The Evaluation definition there changes too, since an Evaluation will now include Corrections.

> **Naming: `tooling-review.md` wins where the two docs disagree.** Schemas live in `src/contracts` (not `src/domain`); the fake AI client is selected with `AI_CLIENT=fake` (not `LLM_FAKE=1`); the JSON helper is `chatCompletionJSON` throwing `AiOutputError` with codes `invalid_json` / `schema_mismatch`. T21 may introduce an `LlmClient` interface on top of that, keeping those names and codes. Slice IDs here (S0–S14) are superseded by the ticket IDs in `docs/plan/board.md`.
>
> **Domain names: this doc wins over `implementation-map.md`.** Session statuses `draft_abandoned` / `prompt_unused`; Correction statuses `overturned` / `confirmed_mistake`; `PromptMeta` has `tense` and `wordTarget` (the scenario is the prompt `text`). The bootstrap route is `/api/today` (called `/api/home` below). Quota local day uses server-side `APP_TIME_ZONE`.

---

## 0. Findings from the current code (verified)

| # | Defect | Verified where | Notes |
|---|---|---|---|
| D1 | Louisiana rules duplicated | `prompt-generator.ts` L22–33, `writing-evaluator.ts` L41–54, `CONTEXT.md` L47 | Three copies that have already drifted ("Minimal subjunctive usage" vs "Minimal or absent"). |
| D2 | B2 demands subjunctive | `prompt-generator.ts` L39 `"All major tenses including subjunctive"` | Contradicts the dialect rule. C1/C2 "All tenses" implies passé simple / futur simple as well. |
| D3 | Unvalidated LLM JSON | `openai-client.ts` L48 `JSON.parse(text) as T` | A parse failure throws a raw `SyntaxError`, which becomes a 500. The `catch {}` on L34 also drops the cause (timeout, 429 and 401 all look the same). |
| D4 | No Corrections | `writing-evaluator.ts` `Evaluation` | Only scores and tips. |
| D5 | Tracker not initialised; demotion | `evaluate/route.ts` L46–60, `tracker-store.ts` | `initTracker()` has no callers. After a restart the singleton is empty, so the route seeds A2 in memory only. A learner at C1 who gets three B1 Evaluations is "advanced" to B1, which is a demotion. `consecutiveAbove` lives in memory. |
| D6 | Placement bypasses tracker | `placement/route.ts` L6, L50 | Writes through `db-store.setLevel` with source `"manual"`. |
| D7 | Placement state in module variable | `placement/route.ts` L8 | Lost on restart or HMR. The three writings and Evaluations are never saved. |
| D8 | Quota uses the UTC date | `quota-store.ts` L6, L17 | `toISOString().split("T")[0]`. In UTC-6 the quota resets at 18:00 local time. Read-then-write increment is also racy. |
| D9 | Test wipes the real DB | `history-store.test.ts` L11–13, `vitest.config.ts` (no env), `db/index.ts` (defaults to `file:./data.db`) | Confirmed: the real `data.db` now holds a single row, id 35, `evaluation_json = {"score": 5}`, `prompt_constraints = {}`. That is the residue of this test. `level_changes` and `daily_quota` are empty. |
| D10 | No body validation | All routes | `evaluate/route.ts` L12 casts the body, L29 `JSON.parse(session.promptConstraints)` is unguarded. `level` PUT accepts any `source`, including `"auto"`, from the client. No route has try/catch, so AI failures become HTML 500s. |
| D11 | No Drafts; abandoned and unused prompts look the same | `sessions` schema | Both have `writing_text = null`. |
| D12 (new) | Evaluated level overwrites the prompt level | `evaluate/route.ts` L42 | `cefrLevel: evaluation.overall_cefr` replaces the level the prompt was generated for. |
| D13 (new) | History crashes on malformed rows | `history-page.tsx` L32–37 | Unguarded `JSON.parse`. The existing row `{"score":5}` would crash `EvaluationCard`. |
| D14 (new) | `zod` is not a direct dependency | `package.json` | v4.4.3 is only present transitively (via openai and eslint). Add it explicitly. |
| D15 (new) | Project is not in its own git repo | `git rev-parse` resolves to `~/Personal-Projects`, where this folder is untracked (`??`) | Relevant to the Dialect Note "git history" argument in §6. |

---

## 1. Target domain model

Zod schemas are the single source of truth. TS types come from `z.infer`. Put the schemas in `src/domain/` (pure, no I/O) so routes, stores, LLM modules and client components can all import them.

There are three boundaries, each with its own schema:

1. **LLM output** (`*OutputSchema`): model-facing, flat, Structured-Outputs friendly. Every field is required, absent values are `nullable`, and there are no `optional`s.
2. **API bodies** (`*RequestSchema`): strict, with `z.strictObject`.
3. **DB JSON columns** (`*StoredSchema`): always parsed with `safeParse`. A failure turns into a `dataIssue` on the DTO and never throws.

```ts
// src/domain/cefr.ts
export const CefrLevel = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export type CefrLevel = z.infer<typeof CefrLevel>;

// src/domain/mistake-category.ts — see §1.1 for the taxonomy
export const MistakeCategory = z.enum([
  "conjugaison", "imparfait_pc", "infinitif_participe", "auxiliaire",
  "genre", "accord", "articles", "prepositions", "pronoms",
  "negation", "ordre_mots", "orthographe", "accents", "vocabulaire",
  "connecteurs", "autre",
]);
export type MistakeCategory = z.infer<typeof MistakeCategory>;

// src/domain/correction.ts
export const CorrectionKind = z.enum(["mistake", "standard", "dialect_check"]);

export const CorrectionStatus = z.enum([
  "open",               // freshly produced
  "acknowledged",       // learner pressed "Compris"
  "confirmed_dialect",  // dialect_check answered "Oui" → Dialect Note created
  "confirmed_mistake",  // dialect_check answered "Non" → now counts as a Mistake
  "overturned",         // mistake pushed back → Dialect Note created
]);

export const Span = z.object({
  start: z.number().int().nonnegative(), // UTF-16 offsets into sessions.writing_text
  end: z.number().int().positive(),
}).refine((s) => s.end > s.start);

export const Correction = z.object({
  id: z.string(),                       // server-assigned (uuid)
  sessionId: z.number().int(),
  ordinal: z.number().int(),            // text order, 1-based (= marker number)
  kind: CorrectionKind,
  quote: z.string().min(1),             // learner text as quoted by the model
  span: Span.nullable(),                // null = could not anchor; still listed, no in-text mark
  anchor: z.enum(["exact", "normalized", "none"]),
  suggestion: z.string(),               // corrected form / Louisiana form / form tutor would propose
  explanation: z.string(),              // French
  question: z.string().nullable(),      // dialect_check only, French
  ruleIfDialect: z.string().nullable(), // model-drafted rule for the Add Dialect Note sheet
  category: MistakeCategory.nullable(), // required for mistake & dialect_check; null for standard
  dlf: z.object({ entryId: z.string(), headword: z.string() }).nullable(), // standard only, server-verified
  resourceIds: z.array(z.string()),     // mistake only; validated against catalog
  status: CorrectionStatus,
  dialectNoteId: z.number().int().nullable(),
  isFocus: z.boolean(),                 // category ∈ session focus snapshot (server-computed)
});
export type Correction = z.infer<typeof Correction>;

/** The one rule for "is this a Mistake?" — used by Weakness memory, counts, History. */
export const countsAsMistake = (c: Pick<Correction, "kind" | "status">) =>
  (c.kind === "mistake" && c.status !== "overturned") ||
  (c.kind === "dialect_check" && c.status === "confirmed_mistake");
```

```ts
// src/domain/evaluation.ts
export const Dimension = z.enum(["grammatical_accuracy", "vocabulary", "coherence", "register_style"]);
export const DimensionScore = z.object({
  score: z.number().int().min(1).max(6),
  comment: z.string(),
});

export const EvaluationV2 = z.object({
  version: z.literal(2),
  dimensions: z.record(Dimension, DimensionScore),
  overallCefr: CefrLevel,
  summary: z.string(),        // French, 1–2 sentences ("summary count line" lives in UI)
  nextLevelTip: z.string(),   // French, framed around next CEFR level
  model: z.string(),          // e.g. "gpt-4o"
  promptVersion: z.string(),  // e.g. "evaluator@2"
  evaluatedAt: z.string(),
});
// Corrections are NOT nested in stored EvaluationV2; they live in the `corrections` table
// (mutable status). The raw model output is kept verbatim in `evaluation_raw` for audit.

export const EvaluationV1 = z.object({ /* today's shape, kept read-only for legacy rows */
  dimensions: z.record(Dimension, z.object({ score: z.number(), max: z.number(), comment: z.string() })),
  overall_cefr: CefrLevel,
  tips: z.object({ per_dimension: z.record(Dimension, z.string()), holistic: z.string() }),
});

export type StoredEvaluation =
  | { status: "v2"; value: z.infer<typeof EvaluationV2> }
  | { status: "v1"; value: z.infer<typeof EvaluationV1> }
  | { status: "malformed" }
  | { status: "none" };

export function parseStoredEvaluation(json: string | null): StoredEvaluation; // never throws
```

```ts
// src/domain/weakness.ts — derived, not stored
export const WeaknessTrend = z.enum(["actif", "en_progres", "tranquille"]);
export const Weakness = z.object({
  category: MistakeCategory,
  label: z.string(),             // French label from taxonomy
  count: z.number().int(),       // total Mistakes in this category, all time
  lastSeenAt: z.string(),
  trend: WeaknessTrend,
  isFocus: z.boolean(),
  pinned: z.boolean(),           // "Pratiquer ça" pending
  resources: z.array(z.lazy(() => Resource)),
});

// src/domain/dialect-note.ts
export const DialectNoteScope = z.enum(["word", "pattern"]); // "ce mot seulement" / "toute la famille"
export const DialectNote = z.object({
  id: z.number().int(),
  rule: z.string().min(3).max(500),        // French, learner has final say
  example: z.string().max(300).nullable(),
  scope: DialectNoteScope,
  form: z.string().min(1).max(80),         // normalized key: the word/lemma ("tomber") or pattern label
  learnerForm: z.string().nullable(),      // "a tombé" (T'as écrit)
  tutorSuggestion: z.string().nullable(),  // "est tombé" (Le tuteur proposait)
  sourceSessionId: z.number().int().nullable(),
  sourceCorrectionId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// src/domain/resource.ts — catalog entries (data file, see §4.4)
export const Resource = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["grammaire", "input"]),
  title: z.string(),              // French display label
  url: z.string().url(),
  source: z.string(),             // "Lawless French", "Télé-Louisiane", …
  categories: z.array(MistakeCategory).min(1),
  dialect: z.enum(["louisiana", "standard"]),
});

// src/domain/session.ts
export const SessionKind = z.enum(["daily", "placement"]);
export const SessionStatus = z.enum(["active", "evaluated", "abandoned"]); // stored
export const SessionDisplayStatus = z.enum([                               // derived for UI
  "in_progress", "evaluated", "draft_abandoned", "prompt_unused",
]);
export const DataIssue = z.enum([
  "evaluation_unreadable", "evaluation_legacy", "prompt_meta_unreadable", "focus_unreadable",
]);

export const Registre = z.enum(["formel", "familier", "mixt"]);
export const PromptMeta = z.object({
  genre: z.string(), tense: z.string(), tone: z.string(),
  registre: Registre, // required: prompt text states it; Evaluation judges Register & Style against it
  wordTarget: z.object({ min: z.number().int(), max: z.number().int() }),
  topic: z.string(), topicTags: z.array(z.string()).max(3),
});

export const Draft = z.object({
  sessionId: z.number().int(),
  text: z.string().max(20_000),
  wordCount: z.number().int(),
  savedAt: z.string(),
});
```

### 1.1 Mistake category taxonomy (Weaknesses aggregate on these)

The list is small (15 plus `autre`) and stable. IDs are persisted, and labels can change freely. The labels use the granularity the mockups show ("Infinitif ou participe", "Imparfait ou passé composé", "Genre des noms", "Accents"). The "Louisiana note" column is part of the evaluator instructions (§4.1). It names forms that must never land in that category.

| id | Label (UI) | Covers | Louisiana note (never a Mistake) |
|---|---|---|---|
| `conjugaison` | Conjugaison | wrong verb form/person/stem | `je vas`, `ça va` 3pl agreement, `eusse a` |
| `imparfait_pc` | Imparfait ou passé composé | aspect choice in past narrative | — |
| `infinitif_participe` | Infinitif ou participe (‑er / ‑é) | `à préparé` vs `à préparer` | — |
| `auxiliaire` | Choix de l'auxiliaire | avoir/être misuse | `avoir` with movement verbs (`il a tombé`, `j'ai venu`) |
| `genre` | Genre des noms | noun gender | regionally attested genders (verify against DLF) |
| `accord` | Accords | adjective/participle/subject–verb agreement | `ça` + 3sg verb for plural subject |
| `articles` | Articles et déterminants | article choice/omission, contractions | — |
| `prepositions` | Prépositions | verb/noun + preposition | `à` for possession (`le char à Tom`) |
| `pronoms` | Pronoms | object/relative/reflexive pronouns | `ça`/`eusse`/`eux-autres`, `vous-autres`, `nous-autres`, `on` |
| `negation` | Négation | misplaced/missing `pas`, `jamais`… | dropped `ne` |
| `ordre_mots` | Ordre des mots | word order, question formation | `quoi faire`, `où-ce que`, `ça qui` questions |
| `orthographe` | Orthographe | misspelling of a word (not accent-only) | DLF-attested spellings (`asteur`, `icitte`) |
| `accents` | Accents (é / è / ê) | accent-only errors | — |
| `vocabulaire` | Choix du mot | wrong word, false friend | DLF-attested English borrowings |
| `connecteurs` | Liaison des idées | connectors and cohesion inside the sentence | `ça fait que`, `mais` as an opener |
| `autre` | Autre | fallback; never shown as Focus | — |

The Louisiana notes column is a starting point written from the existing rules plus DLF lookups. It needs owner review (HITL, §7 S7). An unknown category from the model maps to `autre` and is never rejected.

### 1.2 Weakness trend rule (deterministic)

Let `W` be the last 5 evaluated sessions, both daily and placement, ordered by `evaluated_at`. For each category:

- `s` is the number of sessions in `W` with at least one Mistake in that category, using `countsAsMistake`.
- `latest` is true if the most recent evaluated session has one.

```
actif       if latest || s >= 2
en_progres  if !latest && s === 1
tranquille  if s === 0              (and count ≥ 1 all-time, else not listed)
```

When fewer than 5 sessions exist, `W` is whatever exists. Overturned Mistakes never count. The rule is a pure function, `computeTrend(sessionsWindow)`, unit-tested with tables.

### 1.3 Focus du jour

`computeFocus(weaknesses, pin)`:

1. If a "Pratiquer ça" pin is pending, that category comes first.
2. Fill up to 2 with `actif` Weaknesses, excluding `autre`, ranked by `s` desc, then count in `W` desc, then `lastSeenAt` desc.
3. If none qualify, Focus is empty and the UI hides the line. This is the first-run case.

When a prompt is generated, Focus is snapshotted onto the session (`focus_json`). That snapshot is what History rows are titled by and what the "focus du jour" tag on Corrections is matched against. A pin is consumed by the next generated prompt (`practice_requests.consumed_session_id`).

---

## 2. Schema changes and migration strategy

### 2.1 Recommendation: move from `drizzle-kit push` to generated migrations

Make the switch, in slice S1, before any other schema work.

- The DB is about to hold learner-authored content (Dialect Notes, Drafts, Correction decisions). With SQLite, `push` rebuilds tables for many column changes and prompts interactively about data loss. That's not acceptable once the DB holds real learner content.
- The test DB (§5, D9) must be built from the exact same DDL as production. `migrate()` gives a reproducible path, while `push` needs a live CLI.
- Migrations are reviewable in PRs, and coding agents can read them.

Mechanics:

- `drizzle.config.ts` already has `out: "./drizzle"`. Add scripts: `db:generate` (`drizzle-kit generate`), `db:migrate` (`tsx scripts/migrate.ts`), and keep `db:studio`. Remove `db:push`, or rename it to `db:push:scratch` with a warning.
- `scripts/migrate.ts`:
  1. Copy `data.db` to `data.db.bak-<ISO>`, but only if the file exists and there are pending migrations.
  2. Run `migrate(db, { migrationsFolder: "drizzle" })` from `drizzle-orm/libsql/migrator`.
  3. Run idempotent TS backfills (§2.3).

  Wire it as `predev` and `prestart`. Tests call the same function (§5).
- **Baseline**: `0000_baseline.sql` is generated from the *current* `schema.ts`, then hand-edited to use `CREATE TABLE IF NOT EXISTS`. That way existing push-created DBs accept it, and the migrator records it in `__drizzle_migrations`. All later migrations are additive (`ALTER TABLE … ADD COLUMN`, new tables), so SQLite never needs a table rebuild for these changes.
- Record the decision as `docs/adr/0001-generated-migrations.md`.

### 2.2 Drizzle changes

```ts
// sessions — additive columns
kind:             text("kind").notNull().default("daily"),          // SessionKind
status:           text("status").notNull().default("active"),       // SessionStatus
promptLevel:      text("prompt_level"),                             // level the prompt was generated for (D12)
localDate:        text("local_date"),                               // YYYY-MM-DD in APP_TIME_ZONE (quota key, D8)
promptMetaJson:   text("prompt_meta_json"),                         // PromptMeta
focusJson:        text("focus_json"),                               // MistakeCategory[] snapshot
writingSavedAt:   text("writing_saved_at"),                         // Draft autosave timestamp
evaluatedAt:      text("evaluated_at"),
abandonedAt:      text("abandoned_at"),
evaluationRaw:    text("evaluation_raw"),                           // verbatim model JSON (audit / re-parse)
placementRunId:   integer("placement_run_id"),
placementStep:    integer("placement_step"),
// existing: writing_text (now also holds the Draft until evaluated),
//           evaluation_json (EvaluationV1 | EvaluationV2 | garbage),
//           cefr_level (from now on = evaluated overall level only)

export const corrections = sqliteTable("corrections", {
  id: text("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  ordinal: integer("ordinal").notNull(),
  kind: text("kind").notNull(),
  category: text("category"),
  quote: text("quote").notNull(),
  spanStart: integer("span_start"),
  spanEnd: integer("span_end"),
  anchor: text("anchor").notNull(),
  suggestion: text("suggestion").notNull(),
  explanation: text("explanation").notNull(),
  question: text("question"),
  ruleIfDialect: text("rule_if_dialect"),
  dlfEntryId: text("dlf_entry_id"),
  dlfHeadword: text("dlf_headword"),
  resourceIdsJson: text("resource_ids_json").notNull().default("[]"),
  status: text("status").notNull().default("open"),
  dialectNoteId: integer("dialect_note_id"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
}, (t) => [index("corrections_session_idx").on(t.sessionId),
           index("corrections_cat_idx").on(t.category, t.kind, t.status)]);

export const dialectNotes = sqliteTable("dialect_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rule: text("rule").notNull(),
  example: text("example"),
  scope: text("scope").notNull(),
  form: text("form").notNull(),
  learnerForm: text("learner_form"),
  tutorSuggestion: text("tutor_suggestion"),
  sourceSessionId: integer("source_session_id"),
  sourceCorrectionId: text("source_correction_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),            // soft delete; past overturned corrections stay overturned
});

export const practiceRequests = sqliteTable("practice_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  createdAt: text("created_at").notNull(),
  consumedSessionId: integer("consumed_session_id"),
  cancelledAt: text("cancelled_at"),
});

export const placementRuns = sqliteTable("placement_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status").notNull(),         // in_progress | complete | abandoned
  step: integer("step").notNull(),          // 1..3
  finalLevel: text("final_level"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

// level_changes — additive
revertsChangeId: integer("reverts_change_id"), // set on source = 'undo'
// source becomes: 'manual' | 'auto' | 'placement' | 'undo'

// indexes
index("sessions_quota_idx").on(sessions.kind, sessions.localDate);
index("sessions_created_idx").on(sessions.createdAt);
```

`daily_quota` is dropped in a later migration, once quota is derived from `sessions` (§5, D8). It's empty in the current DB, so there's nothing to carry over.

### 2.3 Existing rows and the malformed `evaluation_json`

Backfill script: `scripts/backfills/2026-11-sessions-v2.ts`. It's idempotent, only touches rows where `status IS NULL OR local_date IS NULL`, and never overwrites `evaluation_json`.

- `local_date` is computed from `created_at` in `APP_TIME_ZONE`.
- `prompt_level` comes from `PromptConstraints.safeParse(prompt_constraints).cefrLevel`, falling back to `cefr_level`.
- `status`:
  - `evaluated` if `evaluation_json` is non-null, whatever its shape, with `evaluated_at = created_at`.
  - Otherwise `abandoned` with `abandoned_at = created_at`.
  - The newest row from today stays `active`.
- `kind = 'daily'`.
- No Corrections are created for legacy rows.

Shapes are resolved at read time by `parseStoredEvaluation`, not by mutating data:

- `v1` gives a DTO with scores and `dataIssues: ["evaluation_legacy"]`. History shows "Évaluation d'avant les corrections".
- `malformed` (e.g. row 35 `{"score": 5}`) gives `dataIssues: ["evaluation_unreadable"]`. History shows the inline notice from `History.dc.html`, and the row still shows its prompt and text.
- `prompt_constraints = "{}"` is tolerated. `promptLevel` comes back `null`, and the UI omits the level chip.

The live DB contains only test residue (row 35). The owner may prefer to delete it rather than backfill. The backfill handles it either way.

---

## 3. API contracts

Conventions:

- **Error envelope**: `{ error: { code: ErrorCode; message: string /* French, displayable */; details?: unknown } }`.
- **`parseBody(req, schema)`**: invalid JSON returns `400 INVALID_JSON`, and a schema failure returns `422 VALIDATION` with `details = zodIssues`. Route params go through `z.coerce.number().int().positive()`.
- **`withErrors(handler)`**: maps `LlmError` to `502 AI_UNAVAILABLE`, `502 AI_INVALID_OUTPUT` or `504 AI_TIMEOUT`, and anything unknown to `500 INTERNAL`. It logs the cause. Routes never return HTML errors.
- **Quota-exhausted UI** needs `resetsAt`, the ISO instant of the next local midnight.

| Code | HTTP |
|---|---|
| INVALID_JSON | 400 |
| NO_LEVEL | 400 |
| NOT_FOUND | 404 |
| ALREADY_EVALUATED / NOT_ACTIVE / CONFLICT | 409 |
| DRAFT_WOULD_BE_ABANDONED | 409 |
| VALIDATION | 422 |
| QUOTA_EXHAUSTED | 429 |
| AI_UNAVAILABLE / AI_INVALID_OUTPUT | 502 |
| AI_TIMEOUT | 504 |

### Home and state

| Route | Request | Response | Errors |
|---|---|---|---|
| `GET /api/home` (new) | — | `{ level: CefrLevel \| null, quota: Quota, focus: FocusItem[], activeSession: SessionDetail \| null, banner: { changeId, from, to } \| null, placement: { runId, step } \| null }` | — |
| `GET /api/quota` (changed) | — | `Quota = { used, remaining, max: 3, resetsAt }` | — |

`GET /api/home` returns everything the Home page needs in one call. `banner` is the latest `auto` level change if no session has been created since it, which implements "clears on next generate".

### Prompts and sessions

| Route | Request | Response | Errors |
|---|---|---|---|
| `POST /api/prompt` (changed) | `{ replaceSessionId?: number, confirmAbandon?: boolean }` | `201 { session: SessionDetail, quota: Quota }` | NO_LEVEL, QUOTA_EXHAUSTED `{resetsAt}`, DRAFT_WOULD_BE_ABANDONED `{ wordCount }` (active session has text and `confirmAbandon` is not true), AI_* |
| `PUT /api/sessions/:id/draft` (new) | `{ text: string ≤ 20000 }` | `{ savedAt, wordCount }` | NOT_FOUND, NOT_ACTIVE (evaluated or abandoned) |
| `POST /api/sessions/:id/evaluate` (replaces `POST /api/evaluate`; keep the old path as a thin alias for one slice) | `{ text: string, 1..20000, trimmed non-empty }` | `{ session: SessionDetail, evaluation: EvaluationV2, corrections: Correction[], advancement: LevelChange \| null }` | NOT_FOUND, ALREADY_EVALUATED, VALIDATION, AI_* |
| `GET /api/sessions` (changed) | `?limit=20&cursor=<createdAt>` | `{ sessions: SessionSummary[], nextCursor: string \| null, levelLine: string }` | — |
| `GET /api/sessions/:id` (new) | — | `SessionDetail` | NOT_FOUND |

Notes on these routes:

- `POST /api/prompt` marks the previous active session `abandoned` and generates the new prompt with Focus, recent topics and the pin.
- `PUT /api/sessions/:id/draft` uses last-write-wins. The client also keeps a localStorage copy for offline use, per the design.
- `POST /api/sessions/:id/evaluate` is allowed when the quota is exhausted. It saves `writing_text` *before* calling the LLM, so an AI failure never loses text. On success it runs the level service.
- `levelLine` in `GET /api/sessions` is the quiet line under the History title, e.g. "A2 depuis le 3 octobre, B1 depuis le 28 octobre".

`SessionSummary`:

```ts
{ id, createdAt, kind, displayStatus, title: string /* Focus labels joined, fallback: topic, never truncated prompt */,
  focus: { id, label }[], wordCount, mistakeCount, countsByKind: { mistake, standard, dialectNote },
  promptLevel: CefrLevel | null, evaluatedLevel: CefrLevel | null, dataIssues: DataIssue[] }
```

`SessionDetail` is `SessionSummary` plus `{ promptText, promptMeta: PromptMeta | null, writingText, writingSavedAt, evaluation: EvaluationV2 | EvaluationV1-as-scores | null, corrections: Correction[] }`.

`displayStatus` is derived as follows:

| Stored state | displayStatus |
|---|---|
| `evaluated` | `evaluated` |
| `active` and `local_date == today` | `in_progress` |
| `abandoned`, or `active` from an earlier day, with non-empty text | `draft_abandoned` |
| `abandoned`, or `active` from an earlier day, with empty text | `prompt_unused` |

### Corrections

| Route | Request | Response | Errors |
|---|---|---|---|
| `PATCH /api/corrections/:id` (new) | `{ action: "acknowledge" \| "reject_dialect" }` | `{ correction: Correction }` | NOT_FOUND, CONFLICT (invalid transition) |

`reject_dialect` means the learner answered "Non, corrige-le". It turns a `dialect_check` into `confirmed_mistake`.

"Oui, c'est à nous-autres" and the "C'est du français louisianais" pushback both go through `POST /api/dialect-notes` with `fromCorrectionId`, so the note and the Correction change in one transaction.

Allowed transitions, enforced in `correction-service`:

- `mistake`: `open` → `acknowledged` | `overturned`; `acknowledged` → `overturned`.
- `standard`: `open` → `acknowledged`.
- `dialect_check`: `open` → `confirmed_dialect` | `confirmed_mistake`.

### Dialect Notes

| Route | Request | Response | Errors |
|---|---|---|---|
| `GET /api/dialect-notes` | — | `{ notes: DialectNote[] }` | — |
| `POST /api/dialect-notes` | `{ rule, example?, scope, form, learnerForm?, tutorSuggestion?, fromCorrectionId? }` | `201 { note, correction?: Correction }` | VALIDATION, NOT_FOUND (correction), CONFLICT (correction not `mistake` or `dialect_check`, or already resolved) |
| `PATCH /api/dialect-notes/:id` | `{ rule?, example?, scope?, form? }` | `{ note }` | NOT_FOUND, VALIDATION |
| `DELETE /api/dialect-notes/:id` | — | `204` | NOT_FOUND |
| `GET /api/dialect-notes/export` | — | `text/markdown` (same renderer as the `dialect:export` script) | — |

When `POST /api/dialect-notes` has a `fromCorrectionId`, the Correction becomes `overturned` (mistake) or `confirmed_dialect` (dialect_check) and `dialectNoteId` is set. `DELETE` is a soft delete.

### Weaknesses and Carnet

| Route | Request | Response | Errors |
|---|---|---|---|
| `GET /api/weaknesses` | — | `{ weaknesses: Weakness[], focus: FocusItem[] }` | — |
| `POST /api/weaknesses/:category/practice` | — | `{ pinned: true }` | VALIDATION (unknown category) |
| `DELETE /api/weaknesses/:category/practice` | — | `{ pinned: false }` | — |

`GET /api/weaknesses` lists only categories with count ≥ 1, ordered by trend (actif, en_progres, tranquille) and then by `s`. `POST …/practice` keeps at most one pending pin by cancelling the previous one.

### Level

| Route | Request | Response | Errors |
|---|---|---|---|
| `GET /api/level` | — | `{ level, history: LevelChange[], streak: number }` | — |
| `PUT /api/level` (changed) | `{ level: CefrLevel }` | `{ change }` | VALIDATION |
| `POST /api/level/undo` (new) | `{ changeId: number }` | `{ change }` | NOT_FOUND, CONFLICT (not the latest change, or not `auto`) |

`PUT /api/level` no longer accepts `source` from the client: it is always `manual`. `POST /api/level/undo` inserts `{ from: to, to: from, source: "undo", revertsChangeId }`. The streak resets implicitly (§5, D5).

### Placement Test

| Route | Request | Response | Errors |
|---|---|---|---|
| `GET /api/placement` (changed) | — | `{ run: null \| { id, status, step, session: SessionDetail, results?: PlacementResult } }` | — |
| `POST /api/placement/start` (new; replaces `action: "start"`) | — | `201 { run }` | CONFLICT (a level is already set, or a run is in progress, in which case the existing run is returned), AI_* |
| `POST /api/placement/:runId/submit` (new) | `{ sessionId, text }` | `{ run }` (next step) or `{ run, results: { finalLevel, summary, steps: { level, overallCefr, mistakeCount }[] } }` | NOT_FOUND, CONFLICT (wrong step or session), VALIDATION, AI_* |

`GET /api/placement` reconstructs the run from the DB. `POST /api/placement/start` creates the run and a `kind = 'placement'` session for step 1. Placement sessions don't count toward quota.

---

## 4. LLM design

### 4.1 Module layout

```
src/modules/llm/
  llm-client.ts        // interface LlmClient { completeJSON<T>(req, schema: ZodType<T>): Promise<T>; completeText(req): Promise<string> }
  openai-llm-client.ts // real impl (replaces openai-client.ts)
  fake-llm-client.ts   // scripted: queue of raw strings | (req) => string; records requests
  errors.ts            // class LlmError { code: "timeout"|"rate_limited"|"unavailable"|"auth"|"invalid_json"|"schema_mismatch"; cause }
src/modules/dialect/
  louisiana-rules.ts   // structured base rules: { id, rule_fr, rule_en, examples[], neverFlag: string[] }
  level-descriptions.ts// dialect-aware CEFR descriptions (fixes D2)
  render.ts            // renderForEvaluator(rules, notes, dlfHints) / renderForGenerator(rules)
  dialect-notes-store.ts
  export-markdown.ts   // renders docs/dialect/louisiana-french.md
src/modules/dlf/       // index loader + lookup (see §6.2)
src/modules/resources/catalog.ts (+ catalog.data.ts)
src/modules/writing-evaluator/  // v2: prompt builder, output schema, post-processor, span locator
src/modules/prompt-generator/   // v2
src/server/services.ts          // composition root: real vs fake client (LLM_FAKE=1 → fixture-backed fake)
```

`completeJSON` works in four steps:

1. Call OpenAI with Structured Outputs: `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`. The schema comes from `zodResponseFormat` in `openai/helpers/zod`, or from `z.toJSONSchema()` if the bundled helper doesn't accept zod 4. Check this in S2.
2. `JSON.parse` in a try block. A failure throws `LlmError("invalid_json")`.
3. `schema.safeParse`. A failure triggers one repair retry that appends the assistant output and a user message listing the zod issues. A second failure throws `LlmError("schema_mismatch")`.
4. Map SDK errors (`APIConnectionTimeoutError`, 429, 401, 5xx) to codes, preserving `cause`.

Strict mode requires every property to be required. Use `.nullable()`, never `.optional()`, in `*OutputSchema`.

### 4.2 Evaluator v2

**Output schema (model-facing):**

```ts
export const EvaluatorOutputSchema = z.object({
  dimensions: z.object({
    grammatical_accuracy: DimensionScore, vocabulary: DimensionScore,
    coherence: DimensionScore, register_style: DimensionScore,
  }),
  overall_cefr: CefrLevel,
  summary: z.string(),
  next_level_tip: z.string(),
  corrections: z.array(z.object({
    kind: CorrectionKind,
    quote: z.string(),              // exact copy from learner text, 1–8 words, no ellipsis
    occurrence: z.number().int(),   // 1-based: which occurrence of `quote` in the text
    suggestion: z.string(),
    explanation: z.string(),        // French
    category: MistakeCategory.nullable(),
    question: z.string().nullable(),
    rule_if_dialect: z.string().nullable(), // French, ≤ 160 chars; required for mistake & dialect_check
    dlf_headword: z.string().nullable(),    // standard only
    resource_ids: z.array(z.string()),      // enum of catalog IDs injected per request when supported
  })).max(15),
});
```

**System prompt outline** (version-stamped `evaluator@2`, built by `buildEvaluatorPrompt(input)`):

1. **Role and language**: "Tu es un tuteur de français louisianais. Écris toutes tes explications, questions, résumé et conseils en français. Le français louisianais est préféré. Le français standard est acceptable. Ne réponds jamais en anglais."
2. **Dialect block**: `renderForEvaluator(louisianaRules, activeDialectNotes, dlfHints)`.
   - Base rules come from the single module (§4.4).
   - Learner Dialect Notes are listed under "Formes confirmées par l'apprenant — ne les signale JAMAIS". Word-scope notes list the form; pattern-scope notes give the rule text.
   - DLF hints: "Mots du texte attestés dans le Dictionary of Louisiana French : asteur, chevrette, … Ne les traite pas comme des fautes."
3. **Correction kinds:**
   - `mistake`: an error in *both* Standard and Louisiana French. Needs a `category` from the enum and `rule_if_dialect`, the sentence that would describe the form if the learner says it's Louisiana.
   - `standard`: the learner used correct Standard French where a common Louisiana form exists. Never an error. `suggestion` is the Louisiana form, `explanation` says it's a regional preference, and `dlf_headword` is the dictionary headword you believe attests it. At most 3 per text, choosing the most useful ones.
   - `dialect_check`: you are unsure whether the form is Louisiana French. Ask, don't judge. `question` is in French, `suggestion` is what you'd propose if it's a mistake, and you give `category` and `rule_if_dialect`.
   - "Si tu hésites entre `mistake` et `dialect_check`, choisis `dialect_check`."
4. **Quoting rules:**
   - Copy `quote` character for character from the learner text.
   - Use the shortest span that shows the problem.
   - No ellipses, no added punctuation.
   - If the same quote appears more than once, set `occurrence`.
   - List corrections in text order with no overlapping quotes.
5. **Resources**: "Pour chaque `mistake`, choisis au plus un ID `grammaire` et un ID `input` dans cette liste, pour sa catégorie. N'invente jamais d'URL ni d'ID." Inject `{id, type, title, categories}` for the catalog (small, under 60 entries).
6. **Focus**: "Catégories travaillées aujourd'hui : … Sois attentif à ces points, mais n'invente pas de fautes."
7. **Scores**: unchanged 1–6 rubric for the four dimensions, `overall_cefr`, and `next_level_tip` framed as "Pour atteindre B2, …". Keep the existing dimension names; the mockup names are placeholders.

**Server post-processing** (`postProcessEvaluation(raw, ctx)`): a pure function, which is the most-tested unit in this plan.

1. **Span location** (`locateQuote(text, quote, occurrence, cursor)`):
   - (a) Exact `indexOf`: take the *n*-th occurrence if it exists, otherwise the first match at or after `cursor` (the end of the previous anchored span), otherwise the first match anywhere.
   - (b) Normalized search over a character-index map: NFC, `’`→`'`, NBSP and narrow NBSP → space, collapsed whitespace, case-folded.
   - (c) Retry with leading and trailing punctuation stripped from the quote.
   - (d) Still not found: `span = null`, `anchor = "none"`. The Correction is kept and listed without an in-text mark.
   - A span overlapping an earlier accepted span also gets `span = null`.
   - Offsets are against `writing_text` exactly as stored. Normalize `\r\n` to `\n` *before* saving and before sending to the model.
2. **Dialect Note guard**: drop any `mistake` or `dialect_check` whose normalized quote or suggestion contains an active word-scope note's `form` or `learnerForm`. This makes "the tutor does not flag that form again" a guarantee for word scope. Pattern scope relies on the prompt. Log dropped items for prompt tuning.
3. **Kind invariants**:
   - `standard` gets `category = null` and `resource_ids = []`.
   - A `mistake` or `dialect_check` without a category gets `autre`.
   - An unknown category becomes `autre`.
   - `question` is required for `dialect_check`; if it's missing, use the template "Ça se dit comme ça chez toi, « {quote} » ?".
   - A `standard` whose suggestion equals its quote is dropped.
4. **Resources**: keep only IDs that exist in the catalog and are tagged with the Correction's category. If none are valid, fill deterministically with the first `grammaire` and first `input` entry for the category.
5. **DLF attribution**: for each `standard`, look up the `suggestion` (and `dlf_headword`) in the DLF index (§6.2). A hit sets `dlf = { entryId, headword }`. A miss sets `dlf = null`: the suggestion stays and only the `DLF` badge is hidden.
6. **Focus tag**: `isFocus = category ∈ session.focus`.
7. Assign `ordinal` by span start, with unanchored items placed after their predecessor, and a uuid `id`.

The output is `{ evaluation: EvaluationV2, corrections: Correction[] }`. The raw output goes into `evaluation_raw`. Explanations are never post-processed for dialect, per the design.

### 4.3 Generator v2

**Input:**

```ts
{ level: CefrLevel;
  focus: { id: MistakeCategory; label: string; elicitHint: string }[]; // elicitHint e.g. imparfait_pc → "un récit au passé avec décor et événements"
  recentTopics: string[];       // topic + topicTags of last 10 sessions (any status)
  wordTarget: { min: 250; max: 300 };
  dialect: "louisiana" }
```

**Output schema:** `{ text, genre, tense, tone, registre: "formel"|"familier"|"mixt", topic, topic_tags: string[≤3] }`, all in French. The server attaches `wordTarget` itself, so the model can't change it. That gives the meta line `genre · temps · 250–300 mots · registre`. The prompt text must declare the registre; the generator varies formel / familier / mixt across sessions so the learner practises both formal and informal styles.

**Instructions:**

- One paragraph-long scenario in French (Louisiana register preferred), addressed to the learner with `tu`.
- The scenario should naturally require the Focus structures without naming grammar terms.
- Avoid the recent topics.
- Never require the subjunctive, the passé simple or the futur simple. Futur proche is fine.
- Ask for 250–300 words.

The light validation is `text` between 150 and 1500 characters. No retry on topic overlap, because it isn't worth the cost.

### 4.4 Single dialect module (replaces D1)

`src/modules/dialect/louisiana-rules.ts` holds the curated base rules as data: id, French rule, English gloss for agents, examples, and a `neverFlag` list.

- Both renderers consume this one file.
- `CONTEXT.md` keeps the definition of Louisiana French but replaces its feature list with a link to `docs/dialect/louisiana-french.md`, the generated export (§6.1).
- **Level descriptions** (D2) are rewritten dialect-aware:
  - B2: "large éventail de temps; le subjonctif est rare en français louisianais et n'est jamais exigé".
  - C1/C2: "registres variés, structures complexes; pas de passé simple ni de subjonctif exigés".

### 4.5 Testing LLM-dependent code without OpenAI

1. **Injected client.** Every LLM consumer takes `LlmClient` in its constructor; the current code already does this structurally. `FakeLlmClient` takes a queue of raw strings or functions `(req) => string` and records every request.
2. **Fixtures.** Raw model outputs live under `src/modules/writing-evaluator/__fixtures__/`:
   - `ok-mixed-kinds.json`
   - `quote-not-found.json`
   - `quote-wrong-case-curly-apostrophe.json`
   - `duplicate-quote-occurrence-2.json`
   - `overlapping-quotes.json`
   - `unknown-category.json`
   - `invented-resource-id.json`
   - `standard-without-dlf-hit.json`
   - `flags-dialect-note-form.json`
   - `english-explanations.json` (passes the schema; documents that we don't block on it)
   - `invalid-json.txt`
   - `missing-field.json`

   These are hand-written now and can be refreshed later from real runs.
3. **Test layers:**
   - **Pure unit tests**: `locateQuote`, `postProcessEvaluation`, `computeTrend`, `computeFocus`, `countsAsMistake`, `localDateKey`, `streak`, `parseStoredEvaluation`.
   - **Contract tests**: every fixture goes through `EvaluatorOutputSchema` and `postProcessEvaluation`, with snapshots of the resulting Corrections.
   - **Prompt-builder tests**: assert the system prompt contains the active notes, Focus labels, catalog IDs and DLF hints, and does *not* contain deleted notes or the word "subjonctif" as a requirement.
   - **Client tests**: `OpenAiLlmClient` with a stubbed `fetch` or SDK covers the error mapping and the one repair retry.
   - **Route tests**: call the handlers directly with `services` overridden by the fake client and a test DB.
4. **Dev without OpenAI.** With `LLM_FAKE=1`, `services.ts` wires a fixture-backed fake so the UI can be built and screenshotted offline.
5. **Optional live check.** `npm run llm:smoke` (manual, needs `OPENAI_API_KEY`, never run by vitest) runs 3 canned texts and checks schema validity and the anchored-span rate. The aim is to track the anchor rate over prompt versions.

---

## 5. Fixes for each known defect

| Defect | Fix | Where | Slice |
|---|---|---|---|
| D1 duplicated rules | One structured rules module and two renderers. CONTEXT.md links to the export. | `src/modules/dialect/*`; remove the constants from the generator and evaluator | S3 |
| D2 B2 subjunctive | Dialect-aware `level-descriptions.ts`. A prompt-builder test asserts the subjunctive is never required. | `src/modules/dialect/level-descriptions.ts` | S3 |
| D3 unvalidated JSON | `completeJSON(req, schema)` with Structured Outputs, `safeParse`, one repair retry and typed `LlmError`. Delete `chatCompletionJSON<T>`. | `src/modules/llm/*` | S2 |
| D4 no Corrections | Evaluator v2, the post-processor and the `corrections` table | `writing-evaluator/*`, `correction-store.ts` | S7 |
| D5 tracker / demotion / streak | Replace `CefrTracker` + `tracker-store` with a stateless `level-service` (below). Delete `initTracker` and the singleton. | `src/modules/cefr-tracker/level-service.ts` | S4 |
| D6 placement bypass | Placement completion calls `levelService.setLevel(level, "placement")` | `placement-service.ts` | S4, S13 |
| D7 placement in memory | `placement_runs` table plus `kind = 'placement'` sessions. The `PlacementTest` class becomes pure functions (`nextStepLevel`, `computeLevel`) driven by DB state. | `placement-test/*`, routes | S13 |
| D8 UTC quota | `localDateKey(now, tz)` via `Intl.DateTimeFormat("en-CA", { timeZone })`, with `tz = process.env.APP_TIME_ZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone`. This is a single-user app whose server runs on the learner's machine. Quota = `count(sessions where kind='daily' and local_date=today)`, checked and inserted in one `db.transaction`. `resetsAt` = next local midnight. Drop `daily_quota`. | `quota-manager/quota-service.ts` | S5 |
| D9 test wipes DB | See below. | `src/db/*`, `vitest.config.ts`, tests | **S0 (first)** |
| D10 no validation | `parseBody` + `withErrors` on every route, request schemas in `src/domain`. `PUT /api/level` drops the client-supplied `source`. | `src/server/http.ts`, all routes | S2 (helpers + existing routes), then each slice |
| D11 drafts / statuses | `status` column, autosave endpoint, `displayStatus` derivation, abandon-on-swap with confirmation | `history-store`, `/api/sessions/*`, `/api/prompt` | S6 |
| D12 level overwrite | `prompt_level` column. `cefr_level` holds only the evaluated level. | schema + evaluate service | S6 |
| D13 History crash | Server returns `dataIssues`. The client never `JSON.parse`s DB strings. | `/api/sessions`, `history-page.tsx` | S6 |
| D14 zod | `npm i zod` (pin ^4) | `package.json` | S2 |

**D5: the level service.** `getLevelState()` takes the current level from the latest `level_changes` row. The streak is computed from the DB: count the trailing evaluated `daily` sessions with `evaluated_at` after `since.createdAt` whose `cefr_level` is above the current level, stopping at the first one that isn't. `recordEvaluation()` promotes one level when the streak reaches 3. With no level set it does nothing; the prompt route already refuses to run without a level, so the evaluate route's A2 seed is deleted. Undo and manual changes create a new `level_changes` row, which resets the streak implicitly. Nothing is held in memory, so nothing is lost on restart and a promotion can never move the level down.

**D9: test DB isolation.**

1. `vitest.config.ts` sets `test.env.DATABASE_URL = "file::memory:"`, or a per-worker temp file `file:/tmp/fwp-test-${VITEST_POOL_ID}.db`.
2. A `setupFiles` entry runs `migrate()` on that database.
3. `src/db/index.ts` throws if `process.env.VITEST` is set and the URL resolves to the repo's `data.db`.
4. Longer term, stores take a `Db` argument (`createHistoryStore(db)`) and tests use a `createTestDb()` helper.
5. Rewrite `history-store.test.ts` against the test DB. Its `'{"score": 5}'` fixture moves into a deliberate "malformed evaluation renders" test.

---

## 6. Dialect Note storage and DLF integration

### 6.1 Dialect Notes: DB is the runtime source of truth, plus a generated markdown export

**Recommendation:**

- The `dialect_notes` table is the only store the app reads and writes.
- `docs/dialect/louisiana-french.md` is a generated, committed snapshot. It combines the base rules from `louisiana-rules.ts` with learner notes grouped by scope.
- The snapshot is produced by `npm run dialect:export` (CLI), and the same renderer serves `GET /api/dialect-notes/export`.
- The file starts with a header: "GÉNÉRÉ — modifier dans l'app (notes) ou dans `src/modules/dialect/louisiana-rules.ts` (règles de base)".

**Reasoning:**

- **The app writing repo files at runtime is the wrong coupling.**
  - Under `next dev`, writing into the source tree risks HMR reloads and races between concurrent saves.
  - In a production build the source tree may be read-only or absent.
  - Every note saved from the UI would create an uncommitted diff the owner didn't ask for.
- **UI CRUD needs structure.** Edit, delete, scope, source session, the link to a Correction and the "never flag" guard all need IDs and a transaction alongside the Correction status change. Parsing markdown back for that is fragile.
- **Single source of truth is preserved.** Learner notes live only in the DB and base rules live only in TS. The markdown is a derived view and is never read back by the app, so there is no two-way sync.
- **Agent readability and git history come from the export.** Agents read one markdown file with stable section anchors, and committing the export after a session gives reviewable history. Note that this project is currently untracked inside the parent `Personal-Projects` repo (D15), so the git-history benefit only arrives once it has its own repo.
- **Tutor runtime** reads from the DB (`listActiveNotes()`) on each evaluation. That's cheap: dozens of rows.

Rejected alternatives:

- **Markdown as the only store**: runtime file writes, plus a parse step on every evaluation.
- **Both stores editable**: two writers mean drift. Exactly the D1 problem again.

If the owner later wants hand-edits in markdown to flow back, add an explicit `dialect:import` that upserts by note id. Don't do it now.

### 6.2 DLF integration (measured)

Source: `~/Personal-Projects/DLF-extract/out/canonical.jsonl`, 20.6 MB. Numbers come from one-off node scripts run outside the repo.

| Measure | Value |
|---|---|
| Entries / JSON parse failures | 16,646 / 0 |
| `parse_status` | 16,630 `needs_review`, 16 `ok`, so the status is useless as a filter |
| Unique headwords | 15,224 |
| Unique normalized spellings (headword + `forms[].spelling`, lowercased, `’`→`'`) | 17,310 |
| Accent-fold collisions | 287 |
| Noisy forms (digits, punctuation, >30 chars, e.g. `Ph36`, `2`, `chomandeur,`) | 7 |
| Capitalized headwords (likely proper nouns or contamination) | 139 |
| Senses / examples / LF example text | 22,051 / 10,274 / 566 KB |
| **Index sizes** | |
| sorted spelling list | 150 KB raw / 52 KB gz |
| spelling → entry ids | 657 KB / 240 KB gz |
| spelling → `[entryId, headword, pos]` | 1,017 KB / 303 KB gz; `JSON.parse` + `Map` in about 9 ms |
| spelling → `[headword, pos, gloss≤40]` | 1,051 KB / 299 KB gz |
| **Coverage** (tokens of DLF's own LF examples found in the index) | |
| all 108,362 tokens | 47.7 % |
| tokens of 6+ letters (27,815) | 54.3 % exact, **67.4 % with naive plural stripping** (`-s`/`-x`, `-aux`→`-al`) |

**What it means:**

- The index holds lemmas only. Closed-class words (`il`, `de`, `le`, `ça`, `je`) and inflections (`était`, `avait`, `enfants`) are missing.
- Some entries were lost to article-boundary parse errors:
  - `maringouin` only appears *inside* the `attaquer` article.
  - `aller`, `char`, `eusse`, `eux-autres`, `nous-autres`, `vous-autres` and `ouaouaron` are not headwords.
- Hits include: `asteur`, `icitte`→`ici`, `boucoup`→`beaucoup`, `chaoui`, `cocodrie`, `chevrette`, `lagniappe`, `fais-dodo`, `catin`.
- The mockup's own example, `ma voiture → mon char`, would get **no** DLF badge from today's extract.

**DLF is positive evidence only. A miss never means wrong.**

**Plan:**

1. **Build script** `scripts/build-dlf-index.ts`:
   - Reads `DLF_CANONICAL_PATH`.
   - Applies NFC normalization, lowercases, and maps `’` to `'`.
   - Drops forms containing digits or punctuation, forms over 30 characters, entries without senses, and capitalized headwords.
   - Emits `src/data/dlf/spellings.json` as `{ [spelling]: [entryId, pos][] }`. The headword is recoverable from the id prefix. Expect about 0.7 MB raw / 250 KB gz.
   - Adds a `meta` block with the source file hash, entry count and build date.
   - Committed or not depends on the open question in §8. If it can't be committed, it goes in `.gitignore` and the lookup degrades to "no DLF" when the file is missing.
2. **Lookup module** `src/modules/dlf/`: `lookup(word)` returns `DlfHit[]`. It tries exact, then plural-stripped, then accent-folded (flagged `accentMismatch`). The index loads lazily once per server process and is server-only (`import "server-only"`), so it never reaches the client bundle.
3. **Evaluator use:**
   - **Pre-call hints**: tokenize the learner text, look up content words of 4+ letters, and inject the hits as "attested in DLF, don't flag" (§4.2 step 2). Cap at about 40 words.
   - **Post-call attribution**: on `standard` Corrections only, the `DLF` badge appears only for a verified hit (§4.2 post-processing step 5).
   - **No hard failure**: a miss never removes a Correction, changes its kind, or blocks the evaluation.
4. **Supplement**: base rules in `louisiana-rules.ts` may carry `dlfRef` for known-lost entries (`char`, `maringouin`, `aller`/`alle`) once the owner verifies them in the printed dictionary. That's preferable to patching the generated index.
5. **Later, not planned here**: the 10,274 examples (566 KB) are good material for comprehensible input or few-shot prompting.

---

## 7. Vertical slices

Each slice is thin and end-to-end (DB, service, API, and minimal UI where relevant), with an estimate of under 500 lines of production code, excluding tests and fixtures. **HITL** marks slices that need an owner decision before or during the work.

| Slice | Scope | Est. prod lines | Depends on | HITL? |
|---|---|---|---|---|
| **S0** Test DB isolation | vitest env + migrate-in-setup + guard in `db/index.ts`; rewrite history-store test | ~60 | — | no |
| **S1** Generated migrations | `drizzle/0000_baseline.sql` (IF NOT EXISTS), `scripts/migrate.ts` with backup, npm scripts, ADR | ~120 | S0 | no |
| **S2** LLM + HTTP boundary | `llm/*` (zod `completeJSON`, Structured Outputs, retry, `LlmError`), `FakeLlmClient`, `parseBody`/`withErrors`, applied to existing routes; add zod dep; delete the A2 seed | ~350 | S0 | no |
| **S3** Single dialect module | `dialect/louisiana-rules.ts`, renderers, dialect-aware level descriptions; generator/evaluator use it; CONTEXT.md link | ~250 | S2 | **yes**: owner reviews rule wording and level descriptions |
| **S4** Level service + undo banner | stateless streak, `source` enum + `reverts_change_id` migration, `POST /api/level/undo`, Home banner with "Rester en B1"; placement completion routed through service | ~300 | S1, S2 | no |
| **S5** Local-midnight quota | `local_date` column + backfill, `quota-service`, `resetsAt`, drop `daily_quota`, quota copy in header | ~200 | S1 | no |
| **S6** Session lifecycle + History v2 | `status`/`prompt_level`/`writing_saved_at`/`abandoned_at` columns, draft autosave endpoint (+ local copy), swap confirm (409 flow), `GET /api/sessions` with `displayStatus` and `dataIssues`, History rows (three statuses + inline notice) | ~480 | S1, S2, S5 | no |
| **S7** Evaluator v2 + Corrections (review screen) | output schema, prompt `evaluator@2`, `locateQuote`, post-processor, `corrections` table, `POST /api/sessions/:id/evaluate`, review UI: marked text + Corrections list + collapsed Scores, `Compris` | ~500 (split S7a server / S7b UI if over) | S2, S3, S6 | **yes**: approve the Mistake taxonomy (§1.1) |
| **S8** Dialect checks, pushback and Dialect Notes | `dialect_notes` table, `PATCH /api/corrections/:id`, `POST/PATCH/DELETE /api/dialect-notes`, Add Dialect Note sheet, Carnet "Mon français louisianais" list, note injection + word-scope guard in evaluator | ~450 | S7 | no |
| **S9** Weakness memory + Focus | `computeTrend`, `computeFocus`, `GET /api/weaknesses`, Carnet "À travailler", Focus line on Home, `focus_json` snapshot, History titles by Focus, `focus du jour` tag | ~400 | S7 | no |
| **S10** Resource catalog | `catalog.data.ts` + schema validation test, evaluator injection + ID validation, Resource links on Corrections and Weaknesses | ~200 (excl. data) | S7, S9 | **yes**: owner curates entries and URLs |
| **S11** Generator v2 | JSON output + `prompt_meta_json`, meta line, Focus + recent topics + "Pratiquer ça" pin (`practice_requests`), 250–300 target | ~300 | S3, S9 | no |
| **S12** DLF index + attribution | build script, generated index, `dlf/` lookup, pre-call hints, post-call `DLF` badge on `standard` | ~250 | S7 | **yes**: licensing / commit decision (§8 Q1) |
| **S13** Persistent Placement Test | `placement_runs`, placement sessions, new routes, resume on reload, results screen data | ~400 | S4, S6, S7 | no |
| **S14** Dialect markdown export | `export-markdown.ts`, `npm run dialect:export`, `GET /api/dialect-notes/export`, first committed `docs/dialect/louisiana-french.md` | ~120 | S3, S8 | no |

Suggested order: S0 → S1 → S2 → (S3, S4, S5 in parallel) → S6 → S7 → (S8, S9, S12 in parallel) → (S10, S11, S13, S14).

S0 should land immediately: running `npm test` today deletes learner data.

---

## 8. Open questions for the owner

1. **DLF licensing and repo visibility.** The DLF is a published, copyrighted dictionary. Will this repo be public? If so, should `src/data/dlf/spellings.json` (about 0.7 MB, headwords, POS and entry ids, no glosses or examples) stay out of git and be generated locally from `DLF-extract`? The default if no answer: gitignored and generated locally.
2. **Mistake taxonomy.** Approve or edit the 15 categories and labels in §1.1, including the Louisiana "never a Mistake" notes. They become persisted IDs, so renaming labels later is free but merging IDs is not.
3. **Score dimensions in review.** Keep the four dimensions as 1–6 numbers, or show them as CEFR sub-levels like the mockup's "Grammaire A2+"? The latter needs a mapping or a model output change.
4. **Placement writings.** Should their Mistakes feed Weakness memory, which would give a populated Carnet and Focus from day one? The plan assumes yes. They never count toward the daily quota either way.
5. **Word target and swap cost.** The plan applies 250–300 words at every level, A1 included (a soft nudge only), and counts "Une autre consigne" swaps against the 3/day quota, as in the handoff. Confirm both, or give an A1/A2 target.
