import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorEnvelope } from "@/contracts/errors";
import { EvaluatePostBody } from "@/contracts/api";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { readResponseJson } from "@/test/read-response-json";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import * as levelService from "@/modules/cefr-tracker/level-store";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import * as historyStore from "@/modules/history-store/history-store";
import * as quotaStore from "@/modules/quota-manager/quota-store";
import * as todayServer from "@/server/today/today";
import { GET as getToday } from "@/app/api/today/route";
import { GET as getSessions } from "@/app/api/sessions/route";
import { GET as getLevel } from "@/app/api/level/route";
import { GET as getQuota } from "@/app/api/quota/route";
import { POST as postPrompt } from "@/app/api/prompt/route";
import { POST as postEvaluate } from "@/app/api/evaluate/route";
import { PUT as putDraft } from "@/app/api/sessions/[id]/draft/route";
import { saveSession } from "@/modules/history-store/history-store";

describe("wrapped API routes return INTERNAL JSON on unexpected errors", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.delete(sessions).execute();
  });

  it("covers today, sessions, level, quota, prompt, evaluate, and draft", async () => {
    vi.spyOn(todayServer, "buildTodayResponse").mockRejectedValueOnce(
      new Error("boom"),
    );
    let response = await getToday();
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toMatch(/json/);
    expect((await response.clone().text()).startsWith("<")).toBe(false);
    expect((await readResponseJson(response, ErrorEnvelope)).error.code).toBe(
      "INTERNAL",
    );

    vi.spyOn(historyStore, "getSessionViews").mockRejectedValueOnce(
      new Error("boom"),
    );
    response = await getSessions();
    expect(response.status).toBe(500);
    expect((await readResponseJson(response, ErrorEnvelope)).error.code).toBe(
      "INTERNAL",
    );

    vi.spyOn(levelService, "getCurrentLevel").mockRejectedValueOnce(
      new Error("boom"),
    );
    response = await getLevel();
    expect(response.status).toBe(500);
    expect((await readResponseJson(response, ErrorEnvelope)).error.code).toBe(
      "INTERNAL",
    );

    vi.spyOn(quotaStore, "getQuotaState").mockRejectedValueOnce(
      new Error("boom"),
    );
    response = await getQuota();
    expect(response.status).toBe(500);
    expect((await readResponseJson(response, ErrorEnvelope)).error.code).toBe(
      "INTERNAL",
    );

    vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
    vi.spyOn(levelService, "getCurrentLevel").mockResolvedValueOnce("B1");
    vi.spyOn(quotaStore, "assertQuotaAvailable").mockRejectedValueOnce(
      new Error("boom"),
    );
    response = await postPrompt(
      new Request("http://localhost/api/prompt", { method: "POST" }),
    );
    expect(response.status).toBe(500);
    expect((await readResponseJson(response, ErrorEnvelope)).error.code).toBe(
      "INTERNAL",
    );
    vi.useRealTimers();

    await setLevel("B1", "manual");
    const session = await saveSession({
      promptText: "Consigne",
      promptConstraints: JSON.stringify({
        cefrLevel: "B1",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: "Mon texte.",
      evaluationJson: null,
      cefrLevel: "B1",
    });
    vi.spyOn(historyStore, "rememberWriting").mockRejectedValueOnce(
      new Error("boom"),
    );
    const evaluateBody = EvaluatePostBody.parse({
      sessionId: session.id,
      writing: "Mon texte.",
    });
    response = await postEvaluate(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evaluateBody),
      }),
    );
    expect(response.status).toBe(500);
    expect((await readResponseJson(response, ErrorEnvelope)).error.code).toBe(
      "INTERNAL",
    );

    const active = await saveSession({
      promptText: "Consigne",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: DEFAULT_DIALECT,
      }),
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-16",
    });
    vi.spyOn(historyStore, "saveActiveDraft").mockRejectedValueOnce(
      new Error("boom"),
    );
    response = await putDraft(
      new Request(`http://localhost/api/sessions/${active.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Salut." }),
      }),
      { params: Promise.resolve({ id: String(active.id) }) },
    );
    expect(response.status).toBe(500);
    expect((await readResponseJson(response, ErrorEnvelope)).error.code).toBe(
      "INTERNAL",
    );
  });
});
