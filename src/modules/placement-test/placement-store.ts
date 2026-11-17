import { and, desc, eq, inArray } from "drizzle-orm";
import { DRAFT_TEXT_MAX, PLACEMENT_STEPS } from "@/config/limits";
import { parseCefrLevel } from "@/contracts/cefr";
import { parseStoredEvaluation } from "@/contracts/evaluation";
import { PlacementRunStatus, PlacementRunView } from "@/contracts/placement";
import { PromptConstraints } from "@/contracts/prompt";
import { db } from "@/db";
import { placementRuns, sessions } from "@/db/schema";
import { localDateKey } from "@/lib/dates";
import { parseJson } from "@/lib/json";
import { parseStoredFocus } from "@/lib/parse-stored-focus";
import { parseStoredPromptMeta } from "@/lib/parse-stored-prompt-meta";
import { getCurrentLevel, setLevel } from "@/modules/cefr-tracker/level-store";
import {
  loadLearnerDialectContext,
  type LearnerDialectContext,
} from "@/modules/dialect/learner-dialect-context";
import {
  getSessionDetail,
  rememberWriting,
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import {
  PromptGenerator,
  type OpenAiClientLike,
  type WritingPrompt,
} from "@/modules/prompt-generator/prompt-generator";
import { quotaTimeZone } from "@/modules/quota-manager/quota-store";
import { WritingEvaluator } from "@/modules/writing-evaluator/writing-evaluator";
import { buildResults, computeLevel, stepLevel } from "./placement-test";

export type PlacementFailure = {
  ok: false;
  code: "NOT_FOUND" | "CONFLICT" | "VALIDATION";
  message: string;
};

type RunRow = typeof placementRuns.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;
const inProgress = PlacementRunStatus.enum.in_progress;
const complete = PlacementRunStatus.enum.complete;
// prettier-ignore
const fail = (code: PlacementFailure["code"], message: string): PlacementFailure =>
  ({ ok: false, code, message });
const uniqueFailed = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("UNIQUE constraint failed") ||
    uniqueFailed(error.cause));

let placementWrites = Promise.resolve();
function withPlacementLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = placementWrites.then(fn, fn);
  // prettier-ignore
  placementWrites = run.then(() => undefined, () => undefined);
  return run;
}

// prettier-ignore
async function runById(id: number) {
  return (await db.select().from(placementRuns).where(eq(placementRuns.id, id)).limit(1))[0] ?? null;
}

// prettier-ignore
async function runByStatus(status: string) {
  return (await db.select().from(placementRuns).where(eq(placementRuns.status, status)).orderBy(desc(placementRuns.id)).limit(1))[0] ?? null;
}

// prettier-ignore
async function sessionFor(runId: number, step: number) {
  return (await db.select().from(sessions).where(and(eq(sessions.placementRunId, runId), eq(sessions.placementStep, step))).limit(1))[0] ?? null;
}

export async function abandonInProgressPlacementRuns(
  now: () => Date = () => new Date(),
) {
  return withPlacementLock(async () => {
    const at = now().toISOString();
    const ids = (
      await db
        .select({ id: placementRuns.id })
        .from(placementRuns)
        .where(eq(placementRuns.status, inProgress))
    ).map((row) => row.id);
    if (ids.length > 0) {
      // prettier-ignore
      await db.update(sessions).set({ status: "abandoned", abandonedAt: at }).where(
        and(inArray(sessions.placementRunId, ids), eq(sessions.status, "active")),
      );
    }
    // prettier-ignore
    await db.update(placementRuns).set({
      status: PlacementRunStatus.enum.abandoned, completedAt: at,
    }).where(eq(placementRuns.status, inProgress));
  });
}

async function insertSession(
  runId: number,
  step: number,
  prompt: WritingPrompt,
  now: Date,
) {
  const meta = prompt.meta;
  if (meta === undefined) throw new Error("Prompt generator returned no meta");
  // prettier-ignore
  await db.insert(sessions).values({
    promptText: prompt.text, promptMetaJson: JSON.stringify(meta),
    promptConstraints: JSON.stringify(prompt.constraints), writingText: null,
    evaluationJson: null, cefrLevel: null, createdAt: now.toISOString(),
    kind: "placement", localDate: localDateKey(now, quotaTimeZone()),
    status: "active", promptLevel: stepLevel(step),
    placementRunId: runId, placementStep: step,
  });
}

export class PlacementService {
  private readonly generator: PromptGenerator;
  private readonly evaluator: WritingEvaluator;
  private readonly now: () => Date;
  private readonly createId: () => string;

  // prettier-ignore
  constructor(deps: {
    client: OpenAiClientLike; now?: () => Date; createId?: () => string;
  }) {
    this.generator = new PromptGenerator(deps.client);
    this.evaluator = new WritingEvaluator(deps.client);
    this.now = deps.now ?? (() => new Date());
    this.createId = deps.createId ?? (() => crypto.randomUUID());
  }

  async getCurrent() {
    const current =
      (await runByStatus(inProgress)) ?? (await runByStatus(complete));
    return { run: current ? await this.toView(current) : null };
  }

  async start(): Promise<
    PlacementFailure | { ok: true; created: boolean; view: PlacementRunView }
  > {
    return withPlacementLock(async () => {
      const existing = await runByStatus(inProgress);
      // prettier-ignore
      if (existing) return { ok: true, created: false, view: await this.toView(existing) };
      if ((await getCurrentLevel()) !== null) {
        return fail("CONFLICT", "Un niveau CECR est déjà défini.");
      }
      const prompt = await this.generator.generate(
        stepLevel(1),
        await loadLearnerDialectContext(),
      );
      const open = await runByStatus(inProgress);
      // prettier-ignore
      if (open) return { ok: true, created: false, view: await this.toView(open) };
      try {
        // prettier-ignore
        const inserted = await db.insert(placementRuns).values({
          status: inProgress, step: 1, finalLevel: null,
          startedAt: this.now().toISOString(), completedAt: null,
        });
        const runId = Number(inserted.lastInsertRowid);
        await insertSession(runId, 1, prompt, this.now());
        const created = await runById(runId);
        if (created === null) {
          throw new Error("placement run missing after insert");
        }
        return { ok: true, created: true, view: await this.toView(created) };
      } catch (error) {
        if (!uniqueFailed(error)) throw error;
        const again = await runByStatus(inProgress);
        if (again === null) throw error;
        return { ok: true, created: false, view: await this.toView(again) };
      }
    });
  }

  async submit(
    runId: number,
    input: { sessionId: number; text: string },
  ): Promise<PlacementFailure | { ok: true; view: PlacementRunView }> {
    return withPlacementLock(async () => {
      const run = await runById(runId);
      if (run === null) {
        return fail("NOT_FOUND", "Test de placement introuvable.");
      }
      if (run.status !== inProgress) {
        return fail("CONFLICT", "Ce test de placement n'est plus en cours.");
      }
      const current = await sessionFor(run.id, run.step);
      if (current === null || current.id !== input.sessionId) {
        // prettier-ignore
        return fail("CONFLICT", "Cette séance n'est pas l'étape en cours du test de placement.");
      }
      const text = input.text.replace(/\r\n/g, "\n").trim();
      if (text.length === 0 || text.length > DRAFT_TEXT_MAX) {
        // prettier-ignore
        return fail("VALIDATION", "Le texte doit contenir entre 1 et 20 000 caractères.");
      }
      const learnerDialect = await loadLearnerDialectContext();
      await this.evaluateIfNeeded(current, text, learnerDialect);
      if (run.step >= PLACEMENT_STEPS) {
        return { ok: true, view: await this.finish(run) };
      }
      const nextStep = run.step + 1;
      if ((await sessionFor(run.id, nextStep)) === null) {
        try {
          // prettier-ignore
          await insertSession(run.id, nextStep, await this.generator.generate(stepLevel(nextStep), learnerDialect), this.now());
        } catch (error) {
          if (!uniqueFailed(error)) throw error;
        }
      }
      // prettier-ignore
      await db.update(placementRuns).set({ step: nextStep }).where(
      and(eq(placementRuns.id, run.id), eq(placementRuns.step, run.step), eq(placementRuns.status, inProgress)),
    );
      const updated = await runById(run.id);
      if (updated === null) {
        throw new Error(`placement run ${run.id} missing after step advance`);
      }
      return { ok: true, view: await this.toView(updated) };
    });
  }

  private async evaluateIfNeeded(
    row: SessionRow,
    text: string,
    learnerDialect: LearnerDialectContext,
  ) {
    if (row.status === "evaluated" || row.evaluationJson) return;
    await rememberWriting(row.id, text, this.now().toISOString());
    const parsed = parseJson(PromptConstraints, row.promptConstraints);
    const fallback =
      parseCefrLevel(row.promptLevel) ?? stepLevel(row.placementStep ?? 1);
    const constraints = parsed.ok
      ? parsed.value
      : { cefrLevel: fallback, dialect: learnerDialect.dialect };
    const promptMeta = parseStoredPromptMeta(row.promptMetaJson);
    const evaluated = await this.evaluator.evaluate(
      text,
      promptMeta
        ? { text: row.promptText, meta: promptMeta, constraints }
        : { text: row.promptText, constraints },
      learnerDialect,
      {
        sessionId: row.id,
        now: this.now,
        createId: this.createId,
        focusCategories: parseStoredFocus(row.focusJson) ?? [],
      },
    );
    await saveSession({
      promptText: row.promptText,
      promptConstraints: row.promptConstraints,
      writingText: text,
      evaluationJson: JSON.stringify(evaluated.evaluation),
      evaluationRaw: JSON.stringify(evaluated.raw),
      cefrLevel: evaluated.evaluation.overallCefr,
      id: row.id,
    });
    await saveCorrections(evaluated.corrections, this.now);
  }

  private async finish(run: RunRow) {
    const results = await this.resultsFor(run);
    // prettier-ignore
    const cas = await db.update(placementRuns).set({
      status: complete, finalLevel: results.finalLevel,
      completedAt: this.now().toISOString(),
    }).where(and(eq(placementRuns.id, run.id), eq(placementRuns.status, inProgress)));
    if (cas.rowsAffected > 0) await setLevel(results.finalLevel, "placement");
    const completed = await runById(run.id);
    if (completed === null) {
      throw new Error(`placement run ${run.id} missing after complete`);
    }
    return this.toView(completed);
  }

  private async resultsFor(run: RunRow) {
    const parts = [];
    // prettier-ignore
    const rows = await db.select().from(sessions).where(eq(sessions.placementRunId, run.id));
    for (const row of rows) {
      const stored = parseStoredEvaluation(row.evaluationJson);
      const step = row.placementStep;
      const promptLevel = parseCefrLevel(row.promptLevel);
      if (stored.status !== "v2" || step === null || promptLevel === null)
        continue;
      const detail = await getSessionDetail(row.id);
      // prettier-ignore
      parts.push({
        step, promptLevel, evaluatedLevel: stored.value.overallCefr,
        summary: stored.value.summary, nextLevelTip: stored.value.nextLevelTip,
        corrections: detail?.corrections ?? [],
      });
    }
    const finalLevel =
      parseCefrLevel(run.finalLevel) ??
      computeLevel(parts.map((part) => part.evaluatedLevel));
    return buildResults({ finalLevel }, parts);
  }

  private async toView(run: RunRow) {
    const sessionRow = await sessionFor(run.id, run.step);
    if (sessionRow === null) {
      throw new Error(`placement run ${run.id} missing step ${run.step}`);
    }
    const session = await getSessionDetail(sessionRow.id);
    if (session === null) {
      throw new Error(`placement session ${sessionRow.id} missing`);
    }
    const done = run.status === complete;
    // prettier-ignore
    return PlacementRunView.parse({
      id: run.id, status: done ? complete : inProgress, step: run.step, session,
      ...(done ? { results: await this.resultsFor(run) } : {}),
    });
  }
}
