import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { corrections, dialectNotes } from "@/db/schema";
import { DIALECT_NOTE_RULE_MAX, DIALECT_NOTE_RULE_MIN } from "@/config/limits";
import { DialectNote } from "@/contracts/dialect-note";
import type { LearnerDialectNote } from "@/contracts/dialect-note";
import type { Correction } from "@/contracts/correction";
import type { DialectNoteCreateBody } from "@/contracts/api";
import { statusAfterDialectNote } from "@/modules/correction-service/correction-service";
import { getCorrection } from "@/modules/history-store/history-store";
import { first } from "@/lib/first";

function noteFromRow(row: typeof dialectNotes.$inferSelect): DialectNote {
  return DialectNote.parse({
    id: row.id,
    rule: row.rule,
    example: row.example,
    scope: row.scope,
    form: row.form,
    learnerForm: row.learnerForm,
    tutorSuggestion: row.tutorSuggestion,
    sourceSessionId: row.sourceSessionId,
    sourceCorrectionId: row.sourceCorrectionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function listActiveNotes(): Promise<LearnerDialectNote[]> {
  const rows = await db
    .select()
    .from(dialectNotes)
    .where(isNull(dialectNotes.deletedAt));
  return rows.map((row) => ({
    scope: row.scope === "pattern" ? "pattern" : "word",
    form: row.form,
    learnerForm: row.learnerForm,
    rule: row.rule,
    deletedAt: null,
  }));
}

export async function createDialectNote(
  input: DialectNoteCreateBody,
  now: () => Date,
): Promise<
  | { ok: true; note: DialectNote; correction?: Correction }
  | { ok: false; code: "NOT_FOUND" | "CONFLICT" | "VALIDATION" }
> {
  const rule = input.rule.trim();
  if (
    rule.length < DIALECT_NOTE_RULE_MIN ||
    rule.length > DIALECT_NOTE_RULE_MAX
  ) {
    return { ok: false, code: "VALIDATION" };
  }

  let current: Correction | null = null;
  let nextStatus: "overturned" | "confirmed_dialect" | null = null;
  if (input.fromCorrectionId !== undefined) {
    current = await getCorrection(input.fromCorrectionId);
    if (current === null) return { ok: false, code: "NOT_FOUND" };
    const next = statusAfterDialectNote(current);
    if (!next.ok) return { ok: false, code: "CONFLICT" };
    nextStatus = next.status;
  }

  const createdAt = now().toISOString();
  let noteId = 0;
  await db.run(sql.raw("BEGIN IMMEDIATE"));
  try {
    const inserted = await db.insert(dialectNotes).values({
      rule,
      example: input.example ?? null,
      scope: input.scope,
      form: input.form,
      learnerForm: input.learnerForm ?? null,
      tutorSuggestion: input.tutorSuggestion ?? null,
      sourceSessionId: current?.sessionId ?? null,
      sourceCorrectionId: input.fromCorrectionId ?? null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    });
    noteId = Number(inserted.lastInsertRowid);
    if (current !== null && nextStatus !== null) {
      await db
        .update(corrections)
        .set({
          status: nextStatus,
          dialectNoteId: noteId,
          resolvedAt: createdAt,
        })
        .where(eq(corrections.id, current.id));
    }
    await db.run(sql.raw("COMMIT"));
  } catch (error) {
    await db.run(sql.raw("ROLLBACK"));
    throw error;
  }

  const rows = await db
    .select()
    .from(dialectNotes)
    .where(eq(dialectNotes.id, noteId))
    .limit(1);
  const note = noteFromRow(first(rows, `dialect note ${noteId}`));
  if (current === null) return { ok: true, note };
  const correction = await getCorrection(current.id);
  if (correction === null) return { ok: true, note };
  return { ok: true, note, correction };
}
