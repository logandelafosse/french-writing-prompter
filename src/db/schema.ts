import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const levelChanges = sqliteTable("level_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromLevel: text("from_level"),
  toLevel: text("to_level").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dailyQuota = sqliteTable("daily_quota", {
  date: text("date").primaryKey(),
  usedCount: integer("used_count").notNull().default(0),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  promptText: text("prompt_text").notNull(),
  promptConstraints: text("prompt_constraints").notNull(),
  writingText: text("writing_text"),
  evaluationJson: text("evaluation_json"),
  cefrLevel: text("cefr_level"),
  createdAt: text("created_at").notNull(),
});
