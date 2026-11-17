import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { corrections, levelChanges, sessions } from "@/db/schema";
import { saveSession } from "@/modules/history-store/history-store";
import evaluationFixture from "@/test/fixtures/ai/evaluation.valid.json";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { SessionsGetResponse } from "@/contracts/api";
import { readResponseJson } from "@/test/read-response-json";
import { GET } from "./route";

const constraints = JSON.stringify({
  cefrLevel: "B1",
  dialect: DEFAULT_DIALECT,
});

function getSessions(query = "") {
  return GET(new Request(`http://localhost/api/sessions${query}`));
}

describe("GET /api/sessions", () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-14T18:00:00.000Z"));
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("malformed evaluation row yields evaluation_unreadable and still lists the prompt", async () => {
    await saveSession({
      promptText: "Consigne score cinq",
      promptConstraints: constraints,
      writingText: "Mon texte gardé.",
      evaluationJson: '{"score": 5}',
      cefrLevel: "A2",
      status: "evaluated",
    });
    await saveSession({
      promptText: "Consigne contraintes vides",
      promptConstraints: "{}",
      writingText: "Autre texte.",
      evaluationJson: JSON.stringify({
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
      }),
      cefrLevel: "A2",
      status: "evaluated",
    });
    await saveSession({
      promptText: "Consigne v1",
      promptConstraints: constraints,
      writingText: "Texte v1.",
      evaluationJson: JSON.stringify(evaluationFixture),
      cefrLevel: "B1",
      status: "evaluated",
    });

    const response = await getSessions();
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, SessionsGetResponse);

    expect(body.sessions).toHaveLength(3);
    const scoreFive = body.sessions.find(
      (row) => row.promptText === "Consigne score cinq",
    );
    expect(scoreFive?.dataIssues).toEqual(["evaluation_unreadable"]);
    expect(scoreFive?.promptText).toBe("Consigne score cinq");

    const emptyConstraints = body.sessions.find(
      (row) => row.promptText === "Consigne contraintes vides",
    );
    expect(emptyConstraints?.dataIssues).toEqual(["prompt_meta_unreadable"]);

    const v1 = body.sessions.find((row) => row.promptText === "Consigne v1");
    expect(v1?.dataIssues).toEqual(["evaluation_legacy"]);
  });

  it("derives display status for abandoned and unused sessions", async () => {
    await saveSession({
      promptText: "Évaluée",
      promptConstraints: constraints,
      writingText: "Texte évalué.",
      evaluationJson: JSON.stringify(evaluationFixture),
      cefrLevel: "B1",
      status: "evaluated",
      localDate: "2026-11-13",
    });
    await saveSession({
      promptText: "Brouillon",
      promptConstraints: constraints,
      writingText: "Un brouillon abandonné.",
      evaluationJson: null,
      cefrLevel: "B1",
      status: "abandoned",
      localDate: "2026-11-13",
    });
    await saveSession({
      promptText: "Inutilisée",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "B1",
      status: "abandoned",
      localDate: "2026-11-12",
    });
    await saveSession({
      promptText: "Aujourd'hui",
      promptConstraints: constraints,
      writingText: "En cours.",
      evaluationJson: null,
      cefrLevel: "B1",
      status: "active",
      localDate: "2026-11-14",
    });
    await saveSession({
      promptText: "Placement",
      promptConstraints: constraints,
      writingText: "Texte placement.",
      evaluationJson: JSON.stringify(evaluationFixture),
      cefrLevel: "B1",
      status: "evaluated",
      kind: "placement",
      localDate: "2026-11-13",
    });

    const response = await getSessions();
    const body = await readResponseJson(response, SessionsGetResponse);
    const byPrompt = Object.fromEntries(
      body.sessions.map((row) => [row.promptText, row.displayStatus]),
    );

    expect(byPrompt).toEqual({
      Évaluée: "evaluated",
      Brouillon: "draft_abandoned",
      Inutilisée: "prompt_unused",
    });
    expect(body.sessions.map((row) => row.promptText)).not.toContain(
      "Aujourd'hui",
    );
    expect(body.sessions.map((row) => row.promptText)).not.toContain(
      "Placement",
    );
  });
});
