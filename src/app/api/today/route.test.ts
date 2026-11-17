import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  corrections,
  levelChanges,
  practiceRequests,
  sessions,
} from "@/db/schema";
import { Correction } from "@/contracts/correction";
import { TodayGetResponse } from "@/contracts/today";
import { setLevel } from "@/modules/cefr-tracker/level-store";
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

describe("GET /api/today", () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
    await db.delete(practiceRequests).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a fresh shape for an empty database", async () => {
    const response = await GET();
    const body = await readResponseJson(response, TodayGetResponse);
    expect(body.level).toBeNull();
    expect(body.levelName).toBeNull();
    expect(body.quota.remaining).toBe(3);
    expect(body.focus).toEqual([]);
    expect(body.activeSession).toBeNull();
    expect(body.reviewSession).toBeNull();
    expect(body.advancement).toBeNull();
  });

  it("returns level only when no session exists today", async () => {
    await setLevel("A2", "manual");
    const response = await GET();
    const body = await readResponseJson(response, TodayGetResponse);
    expect(body.level).toBe("A2");
    expect(body.levelName).toBe("Survie");
    expect(body.activeSession).toBeNull();
  });

  it("returns today's unevaluated session as activeSession", async () => {
    await setLevel("B1", "manual");
    const saved = await saveSession({
      promptText: "Consigne du jour",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "B1",
      localDate: "2026-11-14",
    });

    const response = await GET();
    const body = await readResponseJson(response, TodayGetResponse);
    expect(body.activeSession).toEqual({
      id: saved.id,
      prompt: "Consigne du jour",
      promptMeta: null,
      draft: null,
    });
  });

  it("never returns yesterday's session as activeSession", async () => {
    await setLevel("B1", "manual");
    await saveSession({
      promptText: "Hier",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "B1",
      localDate: "2026-11-13",
    });

    const response = await GET();
    const body = await readResponseJson(response, TodayGetResponse);
    expect(body.activeSession).toBeNull();
  });

  it("treats evaluated sessions today as absent activeSession", async () => {
    await setLevel("B1", "manual");
    await saveSession({
      promptText: "Déjà corrigé",
      promptConstraints: constraints,
      writingText: "Texte",
      evaluationJson: JSON.stringify({
        overall_cefr: "B1",
        dimensions: {
          grammatical_accuracy: { score: 3, max: 6, comment: "ok" },
          vocabulary: { score: 3, max: 6, comment: "ok" },
          coherence: { score: 3, max: 6, comment: "ok" },
          register_style: { score: 3, max: 6, comment: "ok" },
        },
        tips: {
          per_dimension: {
            grammatical_accuracy: "a",
            vocabulary: "b",
            coherence: "c",
            register_style: "d",
          },
          holistic: "e",
        },
      }),
      cefrLevel: "B1",
      localDate: "2026-11-14",
    });

    const response = await GET();
    const body = await readResponseJson(response, TodayGetResponse);
    expect(body.activeSession).toBeNull();
    expect(body.reviewSession).toBeNull();
  });

  it("returns Phase C data with Corrections and their statuses after an evaluation", async () => {
    await setLevel("B1", "manual");
    const evaluation = {
      version: 2 as const,
      dimensions: {
        grammatical_accuracy: { score: 4, comment: "a" },
        vocabulary: { score: 3, comment: "b" },
        coherence: { score: 4, comment: "c" },
        register_style: { score: 3, comment: "d" },
      },
      overallCefr: "B1" as const,
      summary: "s",
      nextLevelTip: "t",
      model: "test-model",
      promptVersion: "evaluator@2",
      evaluatedAt: "2026-11-14T18:00:00.000Z",
    };
    const saved = await saveSession({
      promptText: "Consigne du jour",
      promptConstraints: constraints,
      writingText: "Les enfant jouent.",
      evaluationJson: JSON.stringify(evaluation),
      cefrLevel: "B1",
      localDate: "2026-11-14",
      status: "evaluated",
    });
    await saveCorrections(
      [
        Correction.parse({
          id: "c-open",
          sessionId: saved.id,
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
          status: "acknowledged",
          dialectNoteId: null,
          isFocus: false,
        }),
      ],
      () => new Date(),
    );

    const response = await GET();
    const body = await readResponseJson(response, TodayGetResponse);
    expect(body.activeSession).toBeNull();
    const resources = body.reviewSession?.corrections[0]?.resources ?? [];
    expect(resources.map((link) => link.type)).toEqual(["grammaire", "input"]);
    for (const link of resources) {
      expect(link.url).toMatch(/^https:\/\//);
      expect(link.label.length).toBeGreaterThan(0);
    }
    expect(body.reviewSession).toEqual({
      id: saved.id,
      prompt: "Consigne du jour",
      promptMeta: null,
      writingText: "Les enfant jouent.",
      evaluation,
      corrections: [
        expect.objectContaining({
          id: "c-open",
          status: "acknowledged",
          quote: "Les enfant",
        }),
      ],
    });
  });
});
