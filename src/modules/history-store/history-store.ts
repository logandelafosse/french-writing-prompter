import { db } from "@/db";
import { sessions } from "@/db/schema";
import { first } from "@/lib/first";
import { eq, desc, sql } from "drizzle-orm";

export interface SessionData {
  promptText: string;
  promptConstraints: string;
  writingText: string | null;
  evaluationJson: string | null;
  cefrLevel: string;
  id?: number;
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

  const result = await db.insert(sessions).values({
    promptText: data.promptText,
    promptConstraints: data.promptConstraints,
    writingText: data.writingText,
    evaluationJson: data.evaluationJson,
    cefrLevel: data.cefrLevel,
    createdAt: now,
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
