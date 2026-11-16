import { db } from "@/db";
import { corrections, sessions } from "@/db/schema";
import { localDateKey } from "@/lib/dates";
import { countWords } from "@/lib/count-words";
import { quotaTimeZone } from "@/modules/quota-manager/quota-store";
import type { Correction } from "@/contracts/correction";
import {
  parseStoredEvaluation,
  toPlaceholderEvaluation,
} from "@/contracts/evaluation";
import { PromptConstraints } from "@/contracts/prompt";
import { SessionStatus, type SessionView } from "@/contracts/session";
import { first } from "@/lib/first";
import { parseJson } from "@/lib/json";
import { eq, desc, sql } from "drizzle-orm";

export interface SessionData {
  promptText: string;
  promptConstraints: string;
  writingText: string | null;
  evaluationJson: string | null;
  evaluationRaw?: string | null;
  cefrLevel: string;
  id?: number;
  kind?: string;
  localDate?: string;
  status?: SessionStatus;
  promptLevel?: string | null;
}

export interface Session {
  id: number;
  promptText: string;
  promptConstraints: string;
  promptMetaJson: string | null;
  writingText: string | null;
  evaluationJson: string | null;
  cefrLevel: string | null;
  createdAt: string;
  status: SessionStatus;
  promptLevel: string | null;
}

function sessionStatus(value: string | null): SessionStatus {
  const parsed = SessionStatus.safeParse(value);
  return parsed.success ? parsed.data : "active";
}

function storedStatus(data: SessionData): SessionStatus {
  if (data.status) return data.status;
  if (data.evaluationJson !== null) return "evaluated";
  return "active";
}

export async function saveSession(data: SessionData): Promise<Session> {
  const now = new Date().toISOString();

  if (data.id) {
    await db
      .update(sessions)
      .set({
        writingText: data.writingText,
        evaluationJson: data.evaluationJson,
        cefrLevel: data.cefrLevel,
        ...(data.evaluationRaw !== undefined
          ? { evaluationRaw: data.evaluationRaw }
          : {}),
        ...(data.evaluationJson !== null
          ? { status: "evaluated" as const, evaluatedAt: now }
          : {}),
      })
      .where(eq(sessions.id, data.id));

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, data.id))
      .limit(1);

    return rowToSession(first(rows, `session id ${data.id} after update`));
  }

  const localDate =
    data.localDate ?? localDateKey(new Date(now), quotaTimeZone());
  const status = storedStatus(data);
  const result = await db.insert(sessions).values({
    promptText: data.promptText,
    promptConstraints: data.promptConstraints,
    writingText: data.writingText,
    evaluationJson: data.evaluationJson,
    cefrLevel: data.cefrLevel,
    createdAt: now,
    kind: data.kind ?? "daily",
    localDate,
    status,
    promptLevel: data.promptLevel ?? null,
    evaluatedAt: status === "evaluated" ? now : null,
    abandonedAt: status === "abandoned" ? now : null,
  });

  return {
    id: Number(result.lastInsertRowid),
    promptText: data.promptText,
    promptConstraints: data.promptConstraints,
    promptMetaJson: null,
    writingText: data.writingText,
    evaluationJson: data.evaluationJson,
    cefrLevel: data.cefrLevel,
    createdAt: now,
    status,
    promptLevel: data.promptLevel ?? null,
  };
}

export async function getSession(id: number): Promise<Session | null> {
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  const row = first(rows, `session id ${id}`);
  return rowToSession(row);
}

export async function getAllSessions(): Promise<Session[]> {
  const rows = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.createdAt));

  return rows.map(rowToSession);
}

export async function getSessionViews(): Promise<SessionView[]> {
  const rows = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.createdAt));

  return rows.map(rowToSessionView);
}

export async function sessionCount(): Promise<number> {
  const rows = await db.select({ count: sql`count(*)` }).from(sessions);
  const row = first(rows, "session count");
  return Number(row.count);
}

function rowToSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    promptText: row.promptText,
    promptConstraints: row.promptConstraints,
    promptMetaJson: row.promptMetaJson,
    writingText: row.writingText,
    evaluationJson: row.evaluationJson,
    cefrLevel: row.cefrLevel,
    createdAt: row.createdAt,
    status: sessionStatus(row.status),
    promptLevel: row.promptLevel,
  };
}

export async function saveCorrections(
  rows: Correction[],
  now: () => Date,
): Promise<void> {
  if (rows.length === 0) return;
  const createdAt = now().toISOString();
  await db.insert(corrections).values(
    rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      ordinal: row.ordinal,
      kind: row.kind,
      category: row.category,
      quote: row.quote,
      spanStart: row.span?.start ?? null,
      spanEnd: row.span?.end ?? null,
      anchor: row.anchor,
      suggestion: row.suggestion,
      explanation: row.explanation,
      question: row.question,
      ruleIfDialect: row.ruleIfDialect,
      dlfEntryId: row.dlf?.entryId ?? null,
      dlfHeadword: row.dlf?.headword ?? null,
      resourceIdsJson: JSON.stringify(row.resourceIds),
      status: row.status,
      dialectNoteId: row.dialectNoteId,
      createdAt,
      resolvedAt: null,
    })),
  );
}

export async function saveActiveDraft(
  sessionId: number,
  text: string,
  now: () => Date,
): Promise<
  | { ok: true; savedAt: string; wordCount: number }
  | { ok: false; code: "NOT_FOUND" | "NOT_ACTIVE" }
> {
  const rows = await db
    .select({ status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (rows.length === 0) return { ok: false, code: "NOT_FOUND" };
  const row = first(rows, `session ${sessionId}`);
  if (sessionStatus(row.status) !== "active") {
    return { ok: false, code: "NOT_ACTIVE" };
  }
  const savedAt = now().toISOString();
  await db
    .update(sessions)
    .set({ writingText: text, writingSavedAt: savedAt })
    .where(eq(sessions.id, sessionId));
  return { ok: true, savedAt, wordCount: countWords(text) };
}

export async function rememberWriting(
  sessionId: number,
  text: string,
  savedAt: string,
): Promise<void> {
  await db
    .update(sessions)
    .set({ writingText: text, writingSavedAt: savedAt })
    .where(eq(sessions.id, sessionId));
}

function rowToSessionView(row: typeof sessions.$inferSelect): SessionView {
  const constraints = parseJson(PromptConstraints, row.promptConstraints);
  const promptLevel = constraints.ok ? constraints.value.cefrLevel : null;

  let evaluation: SessionView["evaluation"] = null;
  const stored = parseStoredEvaluation(row.evaluationJson);
  if (stored.status === "v1") {
    evaluation = { ok: true, value: stored.value };
  } else if (stored.status === "v2") {
    evaluation = { ok: true, value: toPlaceholderEvaluation(stored.value) };
  } else if (stored.status === "malformed") {
    evaluation = { ok: false, reason: "unreadable" };
  }

  return {
    id: row.id,
    createdAt: row.createdAt,
    promptText: row.promptText,
    writingText: row.writingText,
    promptLevel,
    evaluation,
  };
}
