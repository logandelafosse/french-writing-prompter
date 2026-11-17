import { beforeEach, describe, expect, it } from "vitest";
import { Correction } from "@/contracts/correction";
import { db } from "@/db";
import { corrections, sessions } from "@/db/schema";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { getSession, saveCorrections, saveSession } from "./history-store";
import { loadSessionForReview, saveDraft } from "./session-facade";

const constraints = JSON.stringify({
  cefrLevel: "A2",
  dialect: DEFAULT_DIALECT,
});

const now = () => new Date("2026-11-17T15:00:00.000Z");

const EVAL_V2 = JSON.stringify({
  version: 2,
  dimensions: {
    grammatical_accuracy: { score: 4, comment: "Accords à revoir." },
    vocabulary: { score: 3, comment: "Lexique simple." },
    coherence: { score: 4, comment: "Suite claire." },
    register_style: { score: 3, comment: "Registre tenu." },
  },
  overallCefr: "B1",
  summary: "Récit clair.",
  nextLevelTip: "Varie les connecteurs.",
  model: "fake",
  promptVersion: "evaluator@2",
  evaluatedAt: "2026-11-17T15:00:00.000Z",
});

describe("sessionFacade", () => {
  beforeEach(async () => {
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("saves draft on active session only", async () => {
    const active = await saveSession({
      promptText: "Consigne",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-17",
      status: "active",
    });

    const saved = await saveDraft(active.id, "Le bayou est calme.", now);

    expect(saved).toEqual({
      ok: true,
      savedAt: "2026-11-17T15:00:00.000Z",
      wordCount: 4,
    });
    expect(await getSession(active.id)).toMatchObject({
      writingText: "Le bayou est calme.",
      status: "active",
    });

    const evaluated = await saveSession({
      promptText: "Déjà corrigé",
      promptConstraints: constraints,
      writingText: "Déjà écrit.",
      evaluationJson: '{"score":5}',
      cefrLevel: "A2",
      localDate: "2026-11-17",
      status: "evaluated",
    });
    const abandoned = await saveSession({
      promptText: "Laissé",
      promptConstraints: constraints,
      writingText: "Brouillon.",
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-17",
      status: "abandoned",
    });

    expect(await saveDraft(evaluated.id, "nouveau texte ici", now)).toEqual({
      ok: false,
      code: "NOT_ACTIVE",
    });
    expect(await saveDraft(abandoned.id, "nouveau texte ici", now)).toEqual({
      ok: false,
      code: "NOT_ACTIVE",
    });
    expect(await getSession(evaluated.id)).toMatchObject({
      writingText: "Déjà écrit.",
    });
    expect(await getSession(abandoned.id)).toMatchObject({
      writingText: "Brouillon.",
    });
  });

  it("load for review returns Evaluation + Corrections", async () => {
    const session = await saveSession({
      promptText: "Raconte la boucherie.",
      promptConstraints: constraints,
      writingText: "Les enfant jouent.",
      evaluationJson: EVAL_V2,
      cefrLevel: "B1",
      localDate: "2026-11-17",
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
      now,
    );

    const review = await loadSessionForReview(session.id, now);

    expect(review).toMatchObject({
      id: session.id,
      writingText: "Les enfant jouent.",
      evaluation: {
        overallCefr: "B1",
        nextLevelTip: "Varie les connecteurs.",
        dimensions: {
          grammatical_accuracy: { score: 4, comment: "Accords à revoir." },
        },
      },
      corrections: [
        {
          kind: "mistake",
          quote: "Les enfant",
          suggestion: "Les enfants",
          explanation: "Accord.",
        },
      ],
    });
  });
});
