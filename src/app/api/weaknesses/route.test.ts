import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  corrections,
  dialectNotes,
  practiceRequests,
  sessions,
} from "@/db/schema";
import { Correction } from "@/contracts/correction";
import { WeaknessesGetResponse } from "@/contracts/api";
import {
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { POST as postDialectNote } from "@/app/api/dialect-notes/route";
import { GET } from "./route";

function correction(
  sessionId: number,
  partial: Pick<Correction, "id" | "kind"> & Partial<Correction>,
): Correction {
  return Correction.parse({
    sessionId,
    ordinal: 1,
    quote: "le table",
    span: { start: 0, end: 8 },
    anchor: "exact",
    suggestion: "la table",
    explanation: "Genre.",
    question: partial.kind === "dialect_check" ? "Ça se dit ?" : null,
    ruleIfDialect: "On dit le table.",
    category: partial.kind === "standard" ? null : "genre",
    dlf: null,
    resourceIds: [],
    status: "open",
    dialectNoteId: null,
    isFocus: false,
    ...partial,
  });
}

async function seedEvaluated(
  evaluatedAt: string,
  kind: "daily" | "placement" = "daily",
) {
  const session = await saveSession({
    promptText: "Écris.",
    promptConstraints: JSON.stringify({
      cefrLevel: "B1",
      dialect: DEFAULT_DIALECT,
    }),
    writingText: "Le table.",
    evaluationJson: "{}",
    cefrLevel: "B1",
    localDate: "2026-11-16",
    status: "evaluated",
    kind,
  });
  await db
    .update(sessions)
    .set({ evaluatedAt })
    .where(eq(sessions.id, session.id));
  return session;
}

describe("GET /api/weaknesses", () => {
  beforeEach(async () => {
    await db.delete(practiceRequests).execute();
    await db.delete(dialectNotes).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("returns only categories with count ≥ 1 and the right trends", async () => {
    const latest = await seedEvaluated("2026-11-16T18:00:00.000Z");
    const earlier = await seedEvaluated("2026-11-10T18:00:00.000Z");
    await saveCorrections(
      [
        correction(latest.id, { id: "c-genre-1", kind: "mistake" }),
        correction(latest.id, {
          id: "c-standard",
          kind: "standard",
          category: null,
          ordinal: 2,
        }),
        correction(earlier.id, { id: "c-genre-2", kind: "mistake" }),
        correction(earlier.id, {
          id: "c-accents",
          kind: "mistake",
          category: "accents",
          status: "overturned",
          ordinal: 2,
        }),
        correction(earlier.id, {
          id: "c-open-check",
          kind: "dialect_check",
          category: "auxiliaire",
          ordinal: 3,
        }),
      ],
      () => new Date("2026-11-16T18:00:00.000Z"),
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, WeaknessesGetResponse);
    expect(body.weaknesses.map((row) => row.category)).toEqual(["genre"]);
    expect(body.weaknesses[0]).toMatchObject({
      category: "genre",
      label: "Genre des noms",
      count: 2,
      lastSeenAt: "2026-11-16T18:00:00.000Z",
      trend: "actif",
    });
  });

  it("counts Mistakes from a placement session", async () => {
    const session = await seedEvaluated(
      "2026-11-16T18:00:00.000Z",
      "placement",
    );
    await saveCorrections(
      [correction(session.id, { id: "c-place", kind: "mistake" })],
      () => new Date(),
    );

    const body = await readResponseJson(await GET(), WeaknessesGetResponse);
    expect(body.weaknesses).toEqual([
      expect.objectContaining({ category: "genre", count: 1, trend: "actif" }),
    ]);
  });

  it("lowers the category count by one after overturning a Mistake", async () => {
    const session = await seedEvaluated("2026-11-16T18:00:00.000Z");
    await saveCorrections(
      [
        correction(session.id, { id: "c-keep", kind: "mistake" }),
        correction(session.id, {
          id: "c-push",
          kind: "mistake",
          ordinal: 2,
        }),
      ],
      () => new Date(),
    );

    const before = await readResponseJson(await GET(), WeaknessesGetResponse);
    expect(before.weaknesses[0]?.count).toBe(2);

    const overturned = await postDialectNote(
      new Request("http://localhost/api/dialect-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule: "On dit le table.",
          example: "Le table est là.",
          scope: "word",
          form: "le table",
          fromCorrectionId: "c-push",
        }),
      }),
    );
    expect(overturned.status).toBe(201);

    const after = await readResponseJson(await GET(), WeaknessesGetResponse);
    expect(after.weaknesses).toEqual([
      expect.objectContaining({ category: "genre", count: 1 }),
    ]);
  });
});
