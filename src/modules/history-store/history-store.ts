import { z } from "zod";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db } from "@/db";
import { corrections, sessions } from "@/db/schema";
import type * as schema from "@/db/schema";
import { localDateKey } from "@/lib/dates";
import { countWords } from "@/lib/count-words";
import { quotaTimeZone } from "@/modules/quota-manager/quota-store";
import {
  countsAsMistake,
  Correction,
  type CorrectionStatus,
} from "@/contracts/correction";
import { attachResources } from "@/modules/resources/catalog";
import {
  parseStoredEvaluation,
  scoresFromStored,
} from "@/contracts/evaluation";
import { PromptConstraints } from "@/contracts/prompt";
import { PromptMeta } from "@/contracts/prompt-meta";
import { FocusSnapshot } from "@/contracts/focus";
import { parseCefrLevel } from "@/contracts/cefr";
import {
  SessionDetail,
  SessionStatus,
  type CorrectionSummaryItem,
  type DataIssue,
  type SessionDisplayStatus,
  type SessionSummary,
} from "@/contracts/session";
import { getLevelHistory } from "@/modules/cefr-tracker/level-store";
import { toFocusItems } from "@/modules/dialect/taxonomy";
import {
  formatHistoryDay,
  formatLevelLine,
  historyTitle,
  writingExcerpt,
} from "@/copy/history";
import { first } from "@/lib/first";
import { parseJson } from "@/lib/json";
import { parseStoredFocus } from "@/lib/parse-stored-focus";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";

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
  focusJson: string | null;
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
    focusJson: null,
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

export async function getSessionDetail(
  id: number,
  options?: { now?: () => Date },
): Promise<SessionDetail | null> {
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const row = first(rows, `session id ${id}`);
  const items = await listCorrectionsForSession(id);
  const tz = quotaTimeZone();
  const today = localDateKey((options?.now ?? (() => new Date()))(), tz);
  const summary = rowToSessionSummary(row, items, tz, today);
  const prompt = readPromptMeta(row);
  const stored = parseStoredEvaluation(row.evaluationJson);
  return SessionDetail.parse({
    ...summary,
    promptMeta: prompt.meta,
    writingText: row.writingText,
    writingSavedAt: row.writingSavedAt,
    evaluation: scoresFromStored(stored),
    corrections: stored.status === "v1" ? [] : items,
  });
}

export async function getAllSessions(): Promise<Session[]> {
  const rows = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.createdAt));

  return rows.map(rowToSession);
}

// prettier-ignore
export async function listSessionSummaries(options: {
  limit: number; cursor?: string; now?: () => Date;
}): Promise<{ sessions: SessionSummary[]; nextCursor: string | null; levelLine: string | null }> {
  const now = options.now ?? (() => new Date());
  const tz = quotaTimeZone();
  const today = localDateKey(now(), tz);
  const rows = await db.select().from(sessions).where(
    options.cursor ? and(eq(sessions.kind, "daily"), lt(sessions.createdAt, options.cursor)) : eq(sessions.kind, "daily"),
  ).orderBy(desc(sessions.createdAt)).limit(options.limit + 2);
  const eligible = rows.filter((row) => displayStatusFor(row, today) !== "in_progress");
  const page = eligible.slice(0, options.limit);
  const nextCursor = eligible.length > options.limit ? (page[page.length - 1]?.createdAt ?? null) : null;
  const ids = page.map((row) => row.id);
  const correctionRows = ids.length === 0 ? [] : await db.select().from(corrections).where(inArray(corrections.sessionId, ids)).orderBy(corrections.ordinal);
  const focusById = new Map(page.map((row) => [row.id, new Set(parseStoredFocus(row.focusJson) ?? [])]));
  const bySession = new Map<number, Correction[]>(page.map((row) => [row.id, []]));
  for (const item of correctionRows) {
    const parsed = correctionFromRow(item, focusById.get(item.sessionId) ?? new Set());
    if (parsed) bySession.get(item.sessionId)?.push(parsed);
  }
  const history = await getLevelHistory();
  const levelLine = formatLevelLine(history, tz);
  return {
    sessions: page.map((row) => rowToSessionSummary(row, bySession.get(row.id) ?? [], tz, today)),
    nextCursor, levelLine,
  };
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
    focusJson: row.focusJson,
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
      contextQuote: row.contextQuote,
      dialectExample: row.dialectExample,
      dialectLemma: row.dialectLemma,
      dialectPattern: row.dialectPattern,
    })),
  );
}

const ResourceIdsJson = z.array(z.string());

function correctionFromRow(
  row: typeof corrections.$inferSelect,
  focusIds: ReadonlySet<string> = new Set(),
): Correction | null {
  const resourceIds = parseJson(ResourceIdsJson, row.resourceIdsJson);
  const span =
    row.spanStart !== null &&
    row.spanEnd !== null &&
    row.spanEnd > row.spanStart
      ? { start: row.spanStart, end: row.spanEnd }
      : null;
  const dlf =
    row.dlfEntryId !== null && row.dlfHeadword !== null
      ? { entryId: row.dlfEntryId, headword: row.dlfHeadword }
      : null;
  const parsed = Correction.safeParse({
    id: row.id,
    sessionId: row.sessionId,
    ordinal: row.ordinal,
    kind: row.kind,
    quote: row.quote,
    span,
    anchor: row.anchor,
    suggestion: row.suggestion,
    explanation: row.explanation,
    question: row.question,
    ruleIfDialect: row.ruleIfDialect,
    category: row.category,
    dlf,
    resourceIds: resourceIds.ok ? resourceIds.value : [],
    status: row.status,
    dialectNoteId: row.dialectNoteId,
    isFocus:
      row.kind === "mistake" &&
      row.category !== null &&
      focusIds.has(row.category),
    contextQuote: row.contextQuote,
    dialectExample: row.dialectExample,
    dialectLemma: row.dialectLemma,
    dialectPattern: row.dialectPattern,
  });
  return parsed.success ? attachResources(parsed.data) : null;
}

type CorrectionReader = Pick<LibSQLDatabase<typeof schema>, "select">;

export async function getCorrection(
  id: string,
  database: CorrectionReader = db,
): Promise<Correction | null> {
  const rows = await database
    .select()
    .from(corrections)
    .where(eq(corrections.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const row = first(rows, `correction ${id}`);
  const sessionRows = await database
    .select({ focusJson: sessions.focusJson })
    .from(sessions)
    .where(eq(sessions.id, row.sessionId))
    .limit(1);
  return correctionFromRow(
    row,
    new Set(parseStoredFocus(sessionRows[0]?.focusJson) ?? []),
  );
}

export async function listCorrectionsForSession(
  sessionId: number,
): Promise<Correction[]> {
  const sessionRows = await db
    .select({ focusJson: sessions.focusJson })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  const focusIds = new Set(parseStoredFocus(sessionRows[0]?.focusJson) ?? []);
  const rows = await db
    .select()
    .from(corrections)
    .where(eq(corrections.sessionId, sessionId))
    .orderBy(corrections.ordinal);
  const items: Correction[] = [];
  for (const row of rows) {
    const parsed = correctionFromRow(row, focusIds);
    if (parsed) items.push(parsed);
  }
  return items;
}

export async function setCorrectionStatus(
  id: string,
  status: CorrectionStatus,
  now: () => Date,
): Promise<Correction | null> {
  await db
    .update(corrections)
    .set({ status, resolvedAt: now().toISOString() })
    .where(eq(corrections.id, id));
  return getCorrection(id);
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

// prettier-ignore
function displayStatusFor(row: typeof sessions.$inferSelect, today: string): SessionDisplayStatus {
  const status = sessionStatus(row.status);
  if (status === "evaluated") return "evaluated";
  if (status === "active" && row.localDate === today) return "in_progress";
  return countWords(row.writingText ?? "") > 0 ? "draft_abandoned" : "prompt_unused";
}

// prettier-ignore
function readPromptMeta(row: typeof sessions.$inferSelect): { meta: PromptMeta | null; unreadable: boolean } {
  if (row.promptMetaJson && row.promptMetaJson.length > 0) {
    const parsed = parseJson(PromptMeta, row.promptMetaJson);
    return { meta: parsed.ok ? parsed.value : null, unreadable: !parsed.ok };
  }
  return { meta: null, unreadable: !parseJson(PromptConstraints, row.promptConstraints).ok };
}

// prettier-ignore
function readFocus(raw: string | null): { ids: NonNullable<ReturnType<typeof parseStoredFocus>>; unreadable: boolean } {
  if (raw === null || raw.length === 0) return { ids: [], unreadable: false };
  const parsed = parseJson(FocusSnapshot, raw);
  return parsed.ok ? { ids: parsed.value, unreadable: false } : { ids: [], unreadable: true };
}

// prettier-ignore
function correctionSummaries(items: Correction[]): {
  mistakeCount: number; countsByKind: SessionSummary["countsByKind"]; correctionsSummary: CorrectionSummaryItem[];
} {
  const correctionsSummary: CorrectionSummaryItem[] = [];
  let mistake = 0, standard = 0, dialectNote = 0;
  for (const item of items) {
    if (countsAsMistake(item)) {
      mistake += 1;
      correctionsSummary.push({ kind: "mistake", quote: item.quote, suggestion: item.suggestion });
    } else if (item.kind === "standard") {
      standard += 1;
      correctionsSummary.push({ kind: "standard", quote: item.quote, suggestion: item.suggestion });
    } else if (item.status === "confirmed_dialect" || item.status === "overturned") {
      dialectNote += 1;
      correctionsSummary.push({ kind: "dialect_note", quote: item.quote });
    }
  }
  return { mistakeCount: mistake, countsByKind: { mistake, standard, dialectNote }, correctionsSummary };
}

// prettier-ignore
function rowToSessionSummary(row: typeof sessions.$inferSelect, items: Correction[], timeZone: string, today: string): SessionSummary {
  const dataIssues: DataIssue[] = [];
  const stored = parseStoredEvaluation(row.evaluationJson);
  if (stored.status === "malformed") dataIssues.push("evaluation_unreadable");
  if (stored.status === "v1") dataIssues.push("evaluation_legacy");
  const prompt = readPromptMeta(row);
  if (prompt.unreadable) dataIssues.push("prompt_meta_unreadable");
  const focus = readFocus(row.focusJson);
  if (focus.unreadable) dataIssues.push("focus_unreadable");
  const focusItems = toFocusItems(focus.ids);
  const constraints = parseJson(PromptConstraints, row.promptConstraints);
  const grouped = correctionSummaries(stored.status === "v1" ? [] : items);
  return {
    id: row.id, createdAt: row.createdAt, kind: row.kind === "placement" ? "placement" : "daily",
    displayStatus: displayStatusFor(row, today),
    title: historyTitle({ focusLabels: focusItems.map((item) => item.historyName), genre: prompt.meta?.genre ?? null, date: formatHistoryDay(row.createdAt, timeZone) }),
    focus: focusItems.map((item) => ({ id: item.id, label: item.historyName })),
    wordCount: countWords(row.writingText ?? ""), mistakeCount: grouped.mistakeCount, countsByKind: grouped.countsByKind,
    promptLevel: constraints.ok ? constraints.value.cefrLevel : parseCefrLevel(row.promptLevel),
    evaluatedLevel: stored.status === "v2" ? stored.value.overallCefr : stored.status === "v1" ? stored.value.overall_cefr : parseCefrLevel(row.cefrLevel),
    dataIssues, promptText: row.promptText, excerpt: writingExcerpt(row.writingText ?? ""),
    correctionsSummary: grouped.correctionsSummary,
  };
}
