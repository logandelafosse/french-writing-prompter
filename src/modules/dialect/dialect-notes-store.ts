import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { corrections, dialectNotes } from "@/db/schema";
import { DIALECT_NOTE_RULE_MAX, DIALECT_NOTE_RULE_MIN } from "@/config/limits";
import { DialectNote } from "@/contracts/dialect-note";
import type { LearnerDialectNote } from "@/contracts/dialect-note";
import type { Correction } from "@/contracts/correction";
import type {
  DialectNoteCreateBody,
  DialectNotePatchBody,
} from "@/contracts/api";
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

export async function listDialectNotes(): Promise<DialectNote[]> {
  const rows = await db
    .select()
    .from(dialectNotes)
    .where(isNull(dialectNotes.deletedAt))
    .orderBy(desc(dialectNotes.createdAt), desc(dialectNotes.id));
  return rows.map(noteFromRow);
}

type NoteWriteResult =
  | { ok: true; note: DialectNote }
  | { ok: false; code: "NOT_FOUND" | "VALIDATION" };

export async function updateDialectNote(
  id: number,
  patch: DialectNotePatchBody,
  now: () => Date,
): Promise<NoteWriteResult> {
  const rule = patch.rule?.trim();
  if (
    rule !== undefined &&
    (rule.length < DIALECT_NOTE_RULE_MIN || rule.length > DIALECT_NOTE_RULE_MAX)
  ) {
    return { ok: false, code: "VALIDATION" };
  }
  const updated = await db
    .update(dialectNotes)
    .set({
      ...(rule === undefined ? {} : { rule }),
      ...(patch.example === undefined ? {} : { example: patch.example }),
      ...(patch.scope === undefined ? {} : { scope: patch.scope }),
      ...(patch.form === undefined ? {} : { form: patch.form }),
      updatedAt: now().toISOString(),
    })
    .where(and(eq(dialectNotes.id, id), isNull(dialectNotes.deletedAt)));
  if (updated.rowsAffected === 0) return { ok: false, code: "NOT_FOUND" };
  // prettier-ignore
  const rows = await db.select().from(dialectNotes).where(eq(dialectNotes.id, id)).limit(1);
  return { ok: true, note: noteFromRow(first(rows, `dialect note ${id}`)) };
}

export async function deleteDialectNote(
  id: number,
  now: () => Date,
): Promise<{ ok: true } | { ok: false; code: "NOT_FOUND" }> {
  const deleted = await db
    .update(dialectNotes)
    .set({ deletedAt: now().toISOString() })
    .where(and(eq(dialectNotes.id, id), isNull(dialectNotes.deletedAt)));
  // prettier-ignore
  return deleted.rowsAffected === 0 ? { ok: false, code: "NOT_FOUND" } : { ok: true };
}

class DialectNoteConflictError extends Error {
  constructor() {
    super("CONFLICT");
    this.name = "DialectNoteConflictError";
  }
}

let createChain = Promise.resolve();

function withCreateLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = createChain.then(fn, fn);
  createChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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

  const createdAt = now().toISOString();
  return withCreateLock(async () => {
    try {
      return await db.transaction(async (tx) => {
        let current: Correction | null = null;
        let nextStatus: "overturned" | "confirmed_dialect" | null = null;
        if (input.fromCorrectionId !== undefined) {
          current = await getCorrection(input.fromCorrectionId, tx);
          if (current === null) return { ok: false, code: "NOT_FOUND" };
          const next = statusAfterDialectNote(current);
          if (!next.ok) return { ok: false, code: "CONFLICT" };
          nextStatus = next.status;
        }

        const inserted = await tx.insert(dialectNotes).values({
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
        const noteId = Number(inserted.lastInsertRowid);
        if (current !== null && nextStatus !== null) {
          const updated = await tx
            .update(corrections)
            .set({
              status: nextStatus,
              dialectNoteId: noteId,
              resolvedAt: createdAt,
            })
            .where(
              and(
                eq(corrections.id, current.id),
                eq(corrections.status, current.status),
              ),
            );
          if (updated.rowsAffected === 0) {
            throw new DialectNoteConflictError();
          }
        }

        const rows = await tx
          .select()
          .from(dialectNotes)
          .where(eq(dialectNotes.id, noteId))
          .limit(1);
        const note = noteFromRow(first(rows, `dialect note ${noteId}`));
        if (current === null) return { ok: true, note };
        const correction = await getCorrection(current.id, tx);
        if (correction === null) return { ok: true, note };
        return { ok: true, note, correction };
      });
    } catch (error) {
      if (error instanceof DialectNoteConflictError) {
        return { ok: false, code: "CONFLICT" };
      }
      throw error;
    }
  });
}
