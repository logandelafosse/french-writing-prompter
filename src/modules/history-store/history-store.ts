import { db } from "@/db";
import { sessions } from "@/db/schema";
import { localDateKey } from "@/lib/dates";
import { quotaTimeZone } from "@/server/quota-time-zone";
import { Evaluation } from "@/contracts/evaluation";
import { PromptConstraints } from "@/contracts/prompt";
import type { SessionView } from "@/contracts/session";
import { first } from "@/lib/first";
import { parseJson } from "@/lib/json";
import { eq, desc, sql } from "drizzle-orm";

export interface SessionData {
  promptText: string;
  promptConstraints: string;
  writingText: string | null;
  evaluationJson: string | null;
  cefrLevel: string;
  id?: number;
  kind?: string;
  localDate?: string;
}

export interface Session {
  id: number;
  promptText: string;
  promptConstraints: string;
  writingText: string | null;
  evaluationJson: string | null;
  cefrLevel: string | null;
  createdAt: string;
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
  const result = await db.insert(sessions).values({
    promptText: data.promptText,
    promptConstraints: data.promptConstraints,
    writingText: data.writingText,
    evaluationJson: data.evaluationJson,
    cefrLevel: data.cefrLevel,
    createdAt: now,
    kind: data.kind ?? "daily",
    localDate,
  });

  return {
    id: Number(result.lastInsertRowid),
    promptText: data.promptText,
    promptConstraints: data.promptConstraints,
    writingText: data.writingText,
    evaluationJson: data.evaluationJson,
    cefrLevel: data.cefrLevel,
    createdAt: now,
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
    writingText: row.writingText,
    evaluationJson: row.evaluationJson,
    cefrLevel: row.cefrLevel,
    createdAt: row.createdAt,
  };
}

function rowToSessionView(row: typeof sessions.$inferSelect): SessionView {
  const constraints = parseJson(PromptConstraints, row.promptConstraints);
  const promptLevel = constraints.ok ? constraints.value.cefrLevel : null;

  let evaluation: SessionView["evaluation"] = null;
  if (row.evaluationJson !== null) {
    const parsed = parseJson(Evaluation, row.evaluationJson);
    evaluation = parsed.ok
      ? { ok: true, value: parsed.value }
      : { ok: false, reason: "unreadable" };
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
