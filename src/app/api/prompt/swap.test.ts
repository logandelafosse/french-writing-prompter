import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import {
  DraftWouldBeAbandonedResponse,
  PromptPostResponse,
} from "@/contracts/api";
import { SessionStatus } from "@/contracts/session";
import { deriveDisplayStatus } from "@/lib/display-status";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { saveSession } from "@/modules/history-store/history-store";
import { PromptGenerator } from "@/modules/prompt-generator/prompt-generator";
import { getQuotaState } from "@/modules/quota-manager/quota-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { getAiClient } from "@/server/ai-client";
import { POST } from "./route";

const today = "2026-11-14";
const constraints = JSON.stringify({
  cefrLevel: "B1",
  dialect: DEFAULT_DIALECT,
});

function promptRequest(body?: {
  replaceSessionId?: number;
  confirmAbandon?: boolean;
}) {
  return new Request("http://localhost/api/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? "{}" : JSON.stringify(body),
  });
}

async function seedActive(writingText: string | null) {
  return saveSession({
    promptText: "Ancienne consigne",
    promptConstraints: constraints,
    writingText,
    evaluationJson: null,
    cefrLevel: "B1",
    localDate: today,
    status: "active",
    promptLevel: "B1",
  });
}

describe("POST /api/prompt swap", { concurrent: false }, () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
    await db.delete(sessions).execute();
    await setLevel("B1", "manual");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires confirmation before abandoning a draft", async () => {
    const active = await seedActive("un deux trois quatre");
    const before = await db.select().from(sessions);

    const response = await POST(promptRequest({ replaceSessionId: active.id }));

    expect(response.status).toBe(409);
    const body = await readResponseJson(
      response,
      DraftWouldBeAbandonedResponse,
    );
    expect(body.wordCount).toBe(4);
    expect(await db.select().from(sessions)).toEqual(before);
  });

  it("abandons the old session and counts against quota", async () => {
    const active = await seedActive("un deux trois quatre");
    const before = await getQuotaState();

    const response = await POST(
      promptRequest({
        replaceSessionId: active.id,
        confirmAbandon: true,
      }),
    );

    expect(response.status).toBe(200);
    const body = await readResponseJson(response, PromptPostResponse);
    expect(body.quota.used).toBe(before.used + 1);
    expect(body.session.id).not.toBe(active.id);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, active.id));
    expect(rows[0]?.status).toBe("abandoned");
    expect(rows[0]?.abandonedAt).toBe("2026-11-14T18:00:00.000Z");
    expect(rows[0]?.writingText).toBe("un deux trois quatre");

    const created = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, body.session.id));
    expect(created[0]?.status).toBe("active");
  });

  it("returns 409 when the draft gains text during prompt generation", async () => {
    const active = await seedActive(null);
    const generate = PromptGenerator.prototype.generate;
    const generateSpy = vi
      .spyOn(PromptGenerator.prototype, "generate")
      .mockImplementation(async (level, dialect) => {
        await db
          .update(sessions)
          .set({ writingText: "un deux trois quatre" })
          .where(eq(sessions.id, active.id));
        return generate.call(
          new PromptGenerator(getAiClient()),
          level,
          dialect,
        );
      });

    const response = await POST(promptRequest({ replaceSessionId: active.id }));

    expect(response.status).toBe(409);
    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("active");
    expect(rows[0]?.id).toBe(active.id);
    generateSpy.mockRestore();
  });

  it("does not abandon a session that became evaluated during generation", async () => {
    const active = await seedActive(null);
    const generate = PromptGenerator.prototype.generate;
    const generateSpy = vi
      .spyOn(PromptGenerator.prototype, "generate")
      .mockImplementation(async (level, dialect) => {
        await db
          .update(sessions)
          .set({
            status: "evaluated",
            evaluationJson: JSON.stringify({ score: 5 }),
            cefrLevel: "B1",
          })
          .where(eq(sessions.id, active.id));
        return generate.call(
          new PromptGenerator(getAiClient()),
          level,
          dialect,
        );
      });

    const response = await POST(promptRequest());

    expect(response.status).toBe(200);
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, active.id));
    expect(rows[0]?.status).toBe("evaluated");
    generateSpy.mockRestore();
  });

  it("abandons an empty prompt without confirmation", async () => {
    const active = await seedActive(null);

    const response = await POST(promptRequest({ replaceSessionId: active.id }));

    expect(response.status).toBe(200);
    const oldRows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, active.id));
    const old = oldRows[0];
    expect(old).toBeDefined();
    if (!old) return;
    expect(
      deriveDisplayStatus(
        {
          status: SessionStatus.parse(old.status),
          localDate: old.localDate,
          writingText: old.writingText,
        },
        today,
      ),
    ).toBe("prompt_unused");
  });
});
