import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { corrections, sessions } from "@/db/schema";
import { Correction } from "@/contracts/correction";
import { SessionDetailGetResponse } from "@/contracts/api";
import { ErrorEnvelope } from "@/contracts/errors";
import {
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { GET } from "./route";

const constraints = JSON.stringify({
  cefrLevel: "B1",
  dialect: DEFAULT_DIALECT,
});

const EVAL_V2 = JSON.stringify({
  version: 2,
  dimensions: {
    grammatical_accuracy: { score: 4, comment: "a" },
    vocabulary: { score: 3, comment: "b" },
    coherence: { score: 4, comment: "c" },
    register_style: { score: 3, comment: "d" },
  },
  overallCefr: "B1",
  summary: "s",
  nextLevelTip: "tip",
  model: "fake",
  promptVersion: "evaluator@2",
  evaluatedAt: "2026-11-14T18:00:00.000Z",
});

function getSession(id: string) {
  return GET(new Request(`http://localhost/api/sessions/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/sessions/:id", () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-14T18:00:00.000Z"));
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns SessionDetail with Corrections for an evaluated session", async () => {
    const session = await saveSession({
      promptText: "Raconte la boucherie.",
      promptConstraints: constraints,
      writingText: "Les enfant jouent.",
      evaluationJson: EVAL_V2,
      cefrLevel: "B1",
      status: "evaluated",
    });
    await saveCorrections(
      [
        Correction.parse({
          id: `${session.id}-1`,
          sessionId: session.id,
          ordinal: 1,
          kind: "mistake",
          quote: "Les enfant",
          span: { start: 0, end: 11 },
          anchor: "exact",
          suggestion: "Les enfants",
          explanation: "Accord.",
          question: null,
          ruleIfDialect: null,
          category: "accord",
          dlf: null,
          resourceIds: [],
          status: "open",
          dialectNoteId: null,
          isFocus: false,
        }),
      ],
      () => new Date(),
    );

    const response = await getSession(String(session.id));
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, SessionDetailGetResponse);
    expect(body.id).toBe(session.id);
    expect(body.writingText).toBe("Les enfant jouent.");
    expect(body.evaluation?.overallCefr).toBe("B1");
    expect(body.corrections).toHaveLength(1);
    expect(body.corrections[0]?.kind).toBe("mistake");
    expect(body.corrections[0]?.quote).toBe("Les enfant");
  });

  it("404 unknown id, 422 non-numeric", async () => {
    const missing = await getSession("999999");
    expect(missing.status).toBe(404);
    const notFound = await readResponseJson(missing, ErrorEnvelope);
    expect(notFound.error.code).toBe("NOT_FOUND");

    const invalid = await getSession("abc");
    expect(invalid.status).toBe(422);
    const validation = await readResponseJson(invalid, ErrorEnvelope);
    expect(validation.error.code).toBe("VALIDATION");
  });
});
