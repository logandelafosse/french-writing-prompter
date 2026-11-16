import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { corrections, levelChanges, sessions } from "@/db/schema";
import { clearEnvCache } from "@/server/env";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { saveSession } from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { EvaluatePostResponse } from "@/contracts/api";
import { ErrorEnvelope } from "@/contracts/errors";
import { readResponseJson } from "@/test/read-response-json";
import { POST } from "./route";
import { POST as postAlias } from "@/app/api/evaluate/route";

const writing =
  "Maintenant je vas au bayou. Les enfant jouent. J'ai vu les enfant près du pont.";

const constraints = JSON.stringify({
  cefrLevel: "A2",
  dialect: DEFAULT_DIALECT,
});

async function seedSession() {
  await setLevel("A2", "manual");
  return saveSession({
    promptText: "Écris sur le bayou.",
    promptConstraints: constraints,
    writingText: null,
    evaluationJson: null,
    cefrLevel: "A2",
    localDate: "2026-11-16",
    promptLevel: "A2",
  });
}

describe("POST /api/sessions/:id/evaluate", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    vi.stubEnv("OPENAI_API_KEY", "");
    clearEnvCache();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("stores corrections in text order and returns them", async () => {
    const session = await seedSession();
    const response = await POST(
      new Request(`http://localhost/api/sessions/${session.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: writing }),
      }),
      { params: Promise.resolve({ id: String(session.id) }) },
    );
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, EvaluatePostResponse);
    expect(body.evaluation.version).toBe(2);
    expect(body.corrections.map((c) => c.quote)).toEqual([
      "Maintenant",
      "je vas",
      "Les enfant",
    ]);
    expect(body.corrections.map((c) => c.ordinal)).toEqual([1, 2, 3]);

    const rows = await db
      .select()
      .from(corrections)
      .where(eq(corrections.sessionId, session.id));
    expect(rows.map((r) => r.ordinal).sort()).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.quote).sort()).toEqual(
      ["Les enfant", "Maintenant", "je vas"].sort(),
    );

    const stored = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id));
    expect(stored[0]?.evaluationRaw).toContain("Maintenant");
    expect(stored[0]?.evaluationJson).toContain('"version":2');
  });

  it("returns 409 on a second call", async () => {
    const session = await seedSession();
    const body = JSON.stringify({ text: writing });
    const first = await POST(
      new Request(`http://localhost/api/sessions/${session.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
      { params: Promise.resolve({ id: String(session.id) }) },
    );
    expect(first.status).toBe(200);
    const second = await POST(
      new Request(`http://localhost/api/sessions/${session.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
      { params: Promise.resolve({ id: String(session.id) }) },
    );
    expect(second.status).toBe(409);
  });

  it("attaches dlf to an attested standard suggestion from the fixture lexicon", async () => {
    const session = await seedSession();
    const response = await POST(
      new Request(`http://localhost/api/sessions/${session.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: writing }),
      }),
      { params: Promise.resolve({ id: String(session.id) }) },
    );
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, EvaluatePostResponse);
    const standard = body.corrections.find((item) => item.kind === "standard");
    expect(standard?.dlf).toEqual({
      entryId: "asteur-0a4c0152c15a",
      headword: "asteur",
    });
  });

  it("still completes Evaluation when the lexicon file is missing", async () => {
    vi.stubEnv("DLF_LEXICON_PATH", "/no/such/dlf-lexicon.json");
    clearEnvCache();
    const session = await seedSession();
    const response = await POST(
      new Request(`http://localhost/api/sessions/${session.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: writing }),
      }),
      { params: Promise.resolve({ id: String(session.id) }) },
    );
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, EvaluatePostResponse);
    const standard = body.corrections.find((item) => item.kind === "standard");
    expect(standard?.kind).toBe("standard");
    expect(standard?.dlf).toBeNull();
    expect(body.evaluation.version).toBe(2);
  });

  it("POST /api/evaluate is a thin alias", async () => {
    const session = await seedSession();
    const response = await postAlias(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing, sessionId: session.id }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, EvaluatePostResponse);
    expect(body.evaluation.version).toBe(2);
    expect(body.corrections.length).toBe(3);
  });

  it("answers 502 AI_INVALID_OUTPUT for malformed model JSON", async () => {
    const session = await seedSession();
    const response = await POST(
      new Request(`http://localhost/api/sessions/${session.id}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-e2e-scenario": "malformed",
        },
        body: JSON.stringify({ text: writing }),
      }),
      { params: Promise.resolve({ id: String(session.id) }) },
    );
    expect(response.status).toBe(502);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("AI_INVALID_OUTPUT");
  });
});
