import { ADVANCEMENT_STREAK } from "@/config/limits";
import { db } from "@/db";
import { levelChanges, sessions } from "@/db/schema";
import {
  CEFR_LEVELS,
  CEFR_ORDER,
  type CefrLevel,
  LevelSource,
  parseCefrLevel,
} from "@/contracts/cefr";
import { type LevelChangeDto } from "@/contracts/api";
import { first } from "@/lib/first";
import { and, desc, eq, gt } from "drizzle-orm";

export type StreakEvaluation = {
  kind: string;
  status: string;
  cefrLevel: string | null;
  evaluatedAt: string | null;
};

export function computeStreak(
  evaluationsNewestFirst: StreakEvaluation[],
  currentLevel: CefrLevel,
  sinceCreatedAt: string,
): number {
  let count = 0;
  const currentIdx = CEFR_ORDER[currentLevel];
  for (const row of evaluationsNewestFirst) {
    if (row.kind !== "daily" || row.status !== "evaluated") {
      continue;
    }
    const at = row.evaluatedAt;
    if (at === null || at <= sinceCreatedAt) {
      break;
    }
    const level = parseCefrLevel(row.cefrLevel);
    if (level === null) {
      break;
    }
    if (CEFR_ORDER[level] <= currentIdx) {
      break;
    }
    count++;
  }
  return count;
}

export function nextLevelUp(current: CefrLevel): CefrLevel | null {
  const idx = CEFR_ORDER[current];
  if (idx >= CEFR_LEVELS.length - 1) {
    return null;
  }
  return CEFR_LEVELS[idx + 1] ?? null;
}

function shouldPromote(streak: number): boolean {
  return streak >= ADVANCEMENT_STREAK;
}

function rowToDto(
  row: typeof levelChanges.$inferSelect,
): LevelChangeDto | null {
  const toLevel = parseCefrLevel(row.toLevel);
  if (toLevel === null) {
    return null;
  }
  const fromLevel = parseCefrLevel(row.fromLevel);
  const sourceParsed = LevelSource.safeParse(row.source);
  if (!sourceParsed.success) {
    return null;
  }
  const dto: LevelChangeDto = {
    id: row.id,
    fromLevel,
    toLevel,
    source: sourceParsed.data,
    createdAt: row.createdAt,
  };
  if (row.revertsChangeId != null) {
    dto.revertsChangeId = row.revertsChangeId;
  }
  return dto;
}

async function latestChangeRow(): Promise<
  typeof levelChanges.$inferSelect | null
> {
  const rows = await db
    .select()
    .from(levelChanges)
    .orderBy(desc(levelChanges.createdAt), desc(levelChanges.id))
    .limit(1);
  if (rows.length === 0) {
    return null;
  }
  return first(rows, "latest level_changes row");
}

export async function getCurrentLevel(): Promise<CefrLevel | null> {
  const row = await latestChangeRow();
  if (row === null) {
    return null;
  }
  return parseCefrLevel(row.toLevel);
}

async function streakEvaluations(
  sinceCreatedAt: string,
): Promise<StreakEvaluation[]> {
  const rows = await db
    .select({
      kind: sessions.kind,
      status: sessions.status,
      cefrLevel: sessions.cefrLevel,
      evaluatedAt: sessions.evaluatedAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.kind, "daily"),
        eq(sessions.status, "evaluated"),
        gt(sessions.evaluatedAt, sinceCreatedAt),
      ),
    )
    .orderBy(desc(sessions.evaluatedAt));

  return rows.map((row) => ({
    kind: row.kind,
    status: row.status ?? "",
    cefrLevel: row.cefrLevel,
    evaluatedAt: row.evaluatedAt,
  }));
}

export async function getStreakCount(): Promise<number> {
  const level = await getCurrentLevel();
  if (level === null) {
    return 0;
  }
  const latest = await latestChangeRow();
  const since = latest?.createdAt ?? "1970-01-01T00:00:00.000Z";
  const evaluations = await streakEvaluations(since);
  return computeStreak(evaluations, level, since);
}

export async function getLevelHistory(): Promise<LevelChangeDto[]> {
  const rows = await db
    .select()
    .from(levelChanges)
    .orderBy(desc(levelChanges.createdAt), desc(levelChanges.id));

  const history: LevelChangeDto[] = [];
  for (const row of rows) {
    const dto = rowToDto(row);
    if (dto !== null) {
      history.push(dto);
    }
  }
  return history;
}

export async function setLevel(
  level: CefrLevel,
  source: (typeof LevelSource.enum)[keyof typeof LevelSource.enum],
  revertsChangeId?: number,
): Promise<LevelChangeDto> {
  const fromLevel = await getCurrentLevel();
  const createdAt = new Date().toISOString();

  const result = await db.insert(levelChanges).values({
    fromLevel,
    toLevel: level,
    source,
    createdAt,
    revertsChangeId: revertsChangeId ?? null,
  });

  const id = Number(result.lastInsertRowid);
  const dto: LevelChangeDto = {
    id,
    fromLevel,
    toLevel: level,
    source,
    createdAt,
  };
  if (revertsChangeId !== undefined) {
    dto.revertsChangeId = revertsChangeId;
  }
  return dto;
}

export async function recordEvaluation(
  overallCefr: CefrLevel,
): Promise<LevelChangeDto | null> {
  const current = await getCurrentLevel();
  if (current === null) {
    return null;
  }
  if (CEFR_ORDER[overallCefr] <= CEFR_ORDER[current]) {
    return null;
  }
  if (nextLevelUp(current) === null) {
    return null;
  }

  const latest = await latestChangeRow();
  const since = latest?.createdAt ?? "1970-01-01T00:00:00.000Z";
  const evaluations = await streakEvaluations(since);
  const streak = computeStreak(evaluations, current, since);

  if (!shouldPromote(streak)) {
    return null;
  }

  const promoted = nextLevelUp(current);
  if (promoted === null) {
    return null;
  }

  return setLevel(promoted, "auto");
}

export async function undoAutoAdvancement(
  changeId: number,
): Promise<LevelChangeDto> {
  const rows = await db
    .select()
    .from(levelChanges)
    .where(eq(levelChanges.id, changeId))
    .limit(1);
  const target =
    rows.length === 0
      ? null
      : rowToDto(first(rows, `level change ${changeId}`));
  if (target === null) {
    throw new UndoLevelError("NOT_FOUND");
  }
  if (target.source !== "auto") {
    throw new UndoLevelError("CONFLICT");
  }
  if (target.fromLevel === null) {
    throw new UndoLevelError("CONFLICT");
  }

  const latest = await latestChangeRow();
  if (latest === null || latest.id !== changeId) {
    throw new UndoLevelError("CONFLICT");
  }

  return setLevel(target.fromLevel, "undo", changeId);
}

export type UndoLevelErrorCode = "NOT_FOUND" | "CONFLICT";

export class UndoLevelError extends Error {
  constructor(readonly code: UndoLevelErrorCode) {
    super(code);
    this.name = "UndoLevelError";
  }
}

export async function getPendingAdvancement(): Promise<LevelChangeDto | null> {
  const latest = await latestChangeRow();
  if (latest === null || latest.source !== "auto") {
    return null;
  }
  const change = rowToDto(latest);
  if (change === null) {
    return null;
  }

  const newerSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(gt(sessions.createdAt, change.createdAt))
    .limit(1);

  if (newerSessions.length > 0) {
    return null;
  }

  return change;
}
