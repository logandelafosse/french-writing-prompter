import { createClient } from "@libsql/client";
import { localDateKey } from "../../src/lib/dates";
import { assertE2eDatabaseUrl } from "../../src/server/e2e-database";

const META = JSON.stringify({
  genre: "récit",
  tense: "imparfait",
  tone: "chaleureux",
  registre: "familier",
  wordTarget: { min: 80, max: 120 },
  topic: "la boucherie",
  topicTags: ["famille"],
});
const CONSTRAINTS = JSON.stringify({
  cefrLevel: "B1",
  dialect: "louisiana",
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

async function insertSession(
  client: ReturnType<typeof createClient>,
  values: {
    prompt: string;
    writing: string | null;
    evaluation: string | null;
    createdAt: string;
    status: string;
  },
): Promise<number> {
  const inserted = await client.execute({
    sql: `INSERT INTO sessions (
      prompt_text, prompt_meta_json, prompt_constraints, writing_text,
      evaluation_json, cefr_level, created_at, kind, local_date, status,
      prompt_level, evaluated_at
    ) VALUES (?, ?, ?, ?, ?, 'B1', ?, 'daily', ?, ?, 'B1', ?)`,
    args: [
      values.prompt,
      META,
      CONSTRAINTS,
      values.writing,
      values.evaluation,
      values.createdAt,
      localDateKey(new Date(values.createdAt), "America/Chicago"),
      values.status,
      values.status === "evaluated" ? values.createdAt : null,
    ],
  });
  return Number(inserted.lastInsertRowid);
}

export async function seedHistoryList(): Promise<{ evaluatedId: number }> {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";
  assertE2eDatabaseUrl(databaseUrl);
  const client = createClient({ url: databaseUrl });
  try {
    await client.execute({
      sql: `INSERT INTO level_changes (from_level, to_level, source, created_at)
        VALUES (NULL, 'A2', 'manual', ?), ('A2', 'B1', 'manual', ?)`,
      args: ["2026-10-03T18:00:00.000Z", "2026-10-28T18:00:00.000Z"],
    });
    const evaluatedId = await insertSession(client, {
      prompt: "Raconte la boucherie.",
      writing: "Un. Deux. Trois quatre.",
      evaluation: EVAL_V2,
      createdAt: "2026-11-14T18:00:00.000Z",
      status: "evaluated",
    });
    await client.execute({
      sql: `INSERT INTO corrections (
        id, session_id, ordinal, kind, category, quote, span_start, span_end,
        anchor, suggestion, explanation, resource_ids_json, status, created_at
      ) VALUES
        (?, ?, 1, 'mistake', 'accord', 'a fait', 0, 6, 'exact', 'faisait', 'Temps.', '[]', 'open', ?),
        (?, ?, 2, 'mistake', 'genre', 'un grand table', 7, 21, 'exact', 'une grande table', 'Genre.', '[]', 'open', ?),
        (?, ?, 3, 'standard', NULL, 'ma voiture', 22, 32, 'exact', 'mon char', 'Louisiane.', '[]', 'open', ?),
        (?, ?, 4, 'dialect_check', 'auxiliaire', 'a tombé', 33, 40, 'exact', 'est tombé', 'Auxiliaire.', '[]', 'confirmed_dialect', ?)`,
      args: [
        `${evaluatedId}-1`,
        evaluatedId,
        "2026-11-14T18:00:00.000Z",
        `${evaluatedId}-2`,
        evaluatedId,
        "2026-11-14T18:00:00.000Z",
        `${evaluatedId}-3`,
        evaluatedId,
        "2026-11-14T18:00:00.000Z",
        `${evaluatedId}-4`,
        evaluatedId,
        "2026-11-14T18:00:00.000Z",
      ],
    });
    await insertSession(client, {
      prompt: "Consigne brouillon.",
      writing: "Un deux trois quatre cinq six sept huit.",
      evaluation: null,
      createdAt: "2026-11-13T18:00:00.000Z",
      status: "abandoned",
    });
    await insertSession(client, {
      prompt: "Consigne jamais écrite.",
      writing: null,
      evaluation: null,
      createdAt: "2026-11-12T18:00:00.000Z",
      status: "abandoned",
    });
    await insertSession(client, {
      prompt: "Consigne cassée.",
      writing: "Texte gardé.",
      evaluation: '{"score": 5}',
      createdAt: "2026-11-11T18:00:00.000Z",
      status: "evaluated",
    });
    return { evaluatedId };
  } finally {
    client.close();
  }
}

const WRITING =
  "Les enfant jouent. J'arrive avec ma voiture. Mon cousin a tombé.";
const EVAL_V1 = JSON.stringify({
  dimensions: {
    grammatical_accuracy: { score: 4, max: 6, comment: "Good grammar" },
    vocabulary: { score: 3, max: 6, comment: "Decent vocab" },
    coherence: { score: 4, max: 6, comment: "Well structured" },
    register_style: { score: 3, max: 6, comment: "Ok register" },
  },
  overall_cefr: "B1",
  tips: {
    per_dimension: {
      grammatical_accuracy: "Work on conjugations",
      vocabulary: "Expand your word choice",
      coherence: "Use more connectors",
      register_style: "Vary your register",
    },
    holistic: "To reach B2, focus on more complex sentence structures.",
  },
});

export async function seedPastReview(): Promise<{
  markedId: number;
  malformedId: number;
  legacyId: number;
}> {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";
  assertE2eDatabaseUrl(databaseUrl);
  const client = createClient({ url: databaseUrl });
  try {
    const markedId = await insertSession(client, {
      prompt: "Raconte la boucherie.",
      writing: WRITING,
      evaluation: EVAL_V2,
      createdAt: "2026-11-14T18:00:00.000Z",
      status: "evaluated",
    });
    const mistakeQuote = "Les enfant";
    const standardQuote = "ma voiture";
    const dialectQuote = "a tombé";
    const mistakeStart = WRITING.indexOf(mistakeQuote);
    const standardStart = WRITING.indexOf(standardQuote);
    const dialectStart = WRITING.indexOf(dialectQuote);
    await client.execute({
      sql: `INSERT INTO corrections (
        id, session_id, ordinal, kind, category, quote, span_start, span_end,
        anchor, suggestion, explanation, question, resource_ids_json, status, created_at
      ) VALUES
        (?, ?, 1, 'mistake', 'accord', ?, ?, ?, 'exact', 'Les enfants', 'Accord.', NULL, '[]', 'open', ?),
        (?, ?, 2, 'standard', NULL, ?, ?, ?, 'exact', 'mon char', 'Louisiane.', NULL, '[]', 'open', ?),
        (?, ?, 3, 'dialect_check', 'auxiliaire', ?, ?, ?, 'exact', 'est tombé', 'Auxiliaire.', ?, '[]', 'open', ?)`,
      args: [
        `${markedId}-1`,
        markedId,
        mistakeQuote,
        mistakeStart,
        mistakeStart + mistakeQuote.length,
        "2026-11-14T18:00:00.000Z",
        `${markedId}-2`,
        markedId,
        standardQuote,
        standardStart,
        standardStart + standardQuote.length,
        "2026-11-14T18:00:00.000Z",
        `${markedId}-3`,
        markedId,
        dialectQuote,
        dialectStart,
        dialectStart + dialectQuote.length,
        "Ça se dit comme ça chez toi, « a tombé » ?",
        "2026-11-14T18:00:00.000Z",
      ],
    });
    const malformedId = await insertSession(client, {
      prompt: "Consigne cassée.",
      writing: "Texte gardé sans marques.",
      evaluation: '{"score": 5}',
      createdAt: "2026-11-11T18:00:00.000Z",
      status: "evaluated",
    });
    const legacyId = await insertSession(client, {
      prompt: "Consigne v1.",
      writing: "Texte d'avant les corrections.",
      evaluation: EVAL_V1,
      createdAt: "2026-11-10T18:00:00.000Z",
      status: "evaluated",
    });
    return { markedId, malformedId, legacyId };
  } finally {
    client.close();
  }
}
