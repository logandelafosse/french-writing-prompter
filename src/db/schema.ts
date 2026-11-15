import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const levelChanges = sqliteTable("level_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromLevel: text("from_level"),
  toLevel: text("to_level").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    promptText: text("prompt_text").notNull(),
    promptConstraints: text("prompt_constraints").notNull(),
    writingText: text("writing_text"),
    evaluationJson: text("evaluation_json"),
    cefrLevel: text("cefr_level"),
    createdAt: text("created_at").notNull(),
    kind: text("kind").notNull().default("daily"),
    localDate: text("local_date"),
  },
  (table) => [index("sessions_quota_idx").on(table.kind, table.localDate)],
);
