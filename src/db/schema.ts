import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const levelChanges = sqliteTable("level_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromLevel: text("from_level"),
  toLevel: text("to_level").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
  revertsChangeId: integer("reverts_change_id"),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    promptText: text("prompt_text").notNull(),
    promptMetaJson: text("prompt_meta_json"),
    promptConstraints: text("prompt_constraints").notNull(),
    writingText: text("writing_text"),
    evaluationJson: text("evaluation_json"),
    cefrLevel: text("cefr_level"),
    createdAt: text("created_at").notNull(),
    kind: text("kind").notNull().default("daily"),
    localDate: text("local_date"),
    status: text("status"),
    promptLevel: text("prompt_level"),
    writingSavedAt: text("writing_saved_at"),
    evaluatedAt: text("evaluated_at"),
    abandonedAt: text("abandoned_at"),
    evaluationRaw: text("evaluation_raw"),
    focusJson: text("focus_json"),
    placementRunId: integer("placement_run_id"),
    placementStep: integer("placement_step"),
  },
  (table) => [index("sessions_quota_idx").on(table.kind, table.localDate)],
);

export const placementRuns = sqliteTable("placement_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status").notNull(),
  step: integer("step").notNull(),
  finalLevel: text("final_level"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

export const corrections = sqliteTable(
  "corrections",
  {
    id: text("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
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
    contextQuote: text("context_quote"),
    dialectExample: text("dialect_example"),
    dialectLemma: text("dialect_lemma"),
    dialectPattern: text("dialect_pattern"),
  },
  (t) => [
    index("corrections_session_idx").on(t.sessionId),
    index("corrections_cat_idx").on(t.category, t.kind, t.status),
  ],
);

export const practiceRequests = sqliteTable("practice_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  createdAt: text("created_at").notNull(),
  consumedSessionId: integer("consumed_session_id"),
  cancelledAt: text("cancelled_at"),
});

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
  deletedAt: text("deleted_at"),
});
