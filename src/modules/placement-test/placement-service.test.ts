import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  corrections,
  levelChanges,
  placementRuns,
  sessions,
} from "@/db/schema";
import { PlacementService } from "./placement-store";
import { getAiClient } from "@/server/ai-client";
import { getDlfIndex } from "@/modules/dlf/load";
import { clearEnvCache } from "@/server/env";
import {
  getStreakCount,
  recordEvaluation,
} from "@/modules/cefr-tracker/level-store";
import { saveSession } from "@/modules/history-store/history-store";
import type { OpenAiClientLike } from "@/modules/prompt-generator/prompt-generator";

const WRITING = "Maintenant je vas. Les enfant jouent au parc.";

async function resetDb() {
  await db.delete(corrections).execute();
  await db.delete(sessions).execute();
  await db.delete(placementRuns).execute();
  await db.delete(levelChanges).execute();
}

function service(client: OpenAiClientLike = getAiClient("happy")) {
  return new PlacementService({
    client,
    dlf: getDlfIndex(),
  });
}

class ScriptedClient implements OpenAiClientLike {
  evaluationCalls = 0;
  failGenerator = false;
  failEvaluation = false;
  private readonly inner = getAiClient("happy");

  chatCompletionJSON<S extends z.ZodType>(
    schema: S,
    params: {
      model: string;
      messages: Array<{ role: "system" | "user"; content: string }>;
    },
    schemaName?: string,
  ): Promise<z.infer<S>> {
    if (schemaName === "evaluation") this.evaluationCalls += 1;
    if (this.failEvaluation && schemaName !== "generator") {
      this.failEvaluation = false;
      return Promise.reject(new Error("AI service error"));
    }
    if (this.failGenerator && schemaName === "generator") {
      this.failGenerator = false;
      return Promise.reject(new Error("AI service error"));
    }
    return this.inner.chatCompletionJSON(schema, params, schemaName);
  }
}

async function completeRun(svc: PlacementService) {
  const started = await svc.start();
  if (!started.ok) throw new Error("expected start");
  let view = started.view;
  for (let step = 0; step < 3; step += 1) {
    const submitted = await svc.submit(view.id, {
      sessionId: view.session.id,
      text: WRITING,
    });
    if (!submitted.ok) throw new Error("expected submit");
    view = submitted.view;
  }
  return view;
}

describe("placement service › full run sets level via level service with source placement", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("stores three placement sessions, a complete run, and a placement level change", async () => {
    const view = await completeRun(service());

    expect(view.status).toBe("complete");
    expect(view.results?.finalLevel).toBe("B1");
    expect(view.results?.levelName).toBe("Seuil");

    const runRows = await db.select().from(placementRuns);
    expect(runRows).toHaveLength(1);
    expect(runRows[0]?.status).toBe("complete");

    const sessionRows = await db.select().from(sessions);
    expect(sessionRows).toHaveLength(3);
    expect(sessionRows.every((row) => row.kind === "placement")).toBe(true);
    expect(sessionRows.every((row) => row.evaluationJson !== null)).toBe(true);

    const correctionRows = await db.select().from(corrections);
    expect(correctionRows.length).toBeGreaterThan(0);

    const changes = await db.select().from(levelChanges);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.source).toBe("placement");
    expect(changes[0]?.toLevel).toBe("B1");
  });
});

describe("placement service › does not consume daily quota", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("creates no daily sessions", async () => {
    await completeRun(service());
    const daily = (await db.select().from(sessions)).filter(
      (row) => row.kind === "daily",
    );
    expect(daily).toHaveLength(0);
  });
});

describe("placement service › resumes current step and draft from a fresh instance", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("reads step 2 draft from a new service over the same DB", async () => {
    const first = service();
    const started = await first.start();
    if (!started.ok) throw new Error("expected start");
    const afterOne = await first.submit(started.view.id, {
      sessionId: started.view.session.id,
      text: WRITING,
    });
    if (!afterOne.ok) throw new Error("expected submit");
    await db
      .update(sessions)
      .set({ writingText: "brouillon étape 2" })
      .where(eq(sessions.id, afterOne.view.session.id));

    const resumed = await service().getCurrent();
    expect(resumed.run?.step).toBe(2);
    expect(resumed.run?.session.writingText).toBe("brouillon étape 2");
  });
});

describe("placement service › evaluation failure keeps text and step", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("saves writing_text and stays on step 1 when evaluation throws", async () => {
    const client = new ScriptedClient();
    const svc = service(client);
    const started = await svc.start();
    if (!started.ok) throw new Error("expected start");
    client.failEvaluation = true;

    await expect(
      svc.submit(started.view.id, {
        sessionId: started.view.session.id,
        text: WRITING,
      }),
    ).rejects.toThrow("AI service error");

    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.writingText).toBe(WRITING);
    const current = await service().getCurrent();
    expect(current.run?.step).toBe(1);
    expect(current.run?.status).toBe("in_progress");
  });
});

describe("placement service › retry after generation failure does not re-evaluate", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("retries only generation on the same session", async () => {
    const client = new ScriptedClient();
    const svc = service(client);
    const started = await svc.start();
    if (!started.ok) throw new Error("expected start");
    client.failGenerator = true;

    await expect(
      svc.submit(started.view.id, {
        sessionId: started.view.session.id,
        text: WRITING,
      }),
    ).rejects.toThrow("AI service error");
    expect(client.evaluationCalls).toBe(1);

    const retried = await svc.submit(started.view.id, {
      sessionId: started.view.session.id,
      text: WRITING,
    });
    if (!retried.ok) throw new Error("expected retry");
    expect(retried.view.step).toBe(2);
    expect(client.evaluationCalls).toBe(1);
  });
});

describe("placement service › placement sessions do not count toward the auto-advancement streak", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("ignores placement Evaluations when counting the streak", async () => {
    await completeRun(service());
    vi.setSystemTime(new Date("2026-12-01T12:00:00.000Z"));
    await saveSession({
      promptText: "Consigne",
      promptConstraints: "{}",
      writingText: "Texte",
      evaluationJson: "{}",
      cefrLevel: "B2",
      kind: "daily",
      localDate: "2026-12-01",
      status: "evaluated",
      promptLevel: "B1",
    });
    await saveSession({
      promptText: "Consigne",
      promptConstraints: "{}",
      writingText: "Texte",
      evaluationJson: "{}",
      cefrLevel: "B2",
      kind: "daily",
      localDate: "2026-12-01",
      status: "evaluated",
      promptLevel: "B1",
    });
    await db
      .update(sessions)
      .set({
        status: "evaluated",
        cefrLevel: "B2",
        evaluatedAt: "2026-12-01T12:00:00.000Z",
      })
      .where(eq(sessions.kind, "daily"));
    await db
      .update(sessions)
      .set({ evaluatedAt: "2026-12-01T12:00:00.000Z" })
      .where(eq(sessions.kind, "placement"));

    expect(await getStreakCount()).toBe(2);
    expect(await recordEvaluation("B2")).toBeNull();
  });
});
