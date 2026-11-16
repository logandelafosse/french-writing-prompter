import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { corrections, dialectNotes, sessions } from "@/db/schema";
import { Correction } from "@/contracts/correction";
import { DialectNoteCreateResponse } from "@/contracts/api";
import { ErrorEnvelope } from "@/contracts/errors";
import {
  getCorrection,
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { POST } from "./route";

function correction(
  sessionId: number,
  partial: Pick<Correction, "id" | "kind"> & Partial<Correction>,
): Correction {
  return Correction.parse({
    sessionId,
    ordinal: 1,
    quote: "a tombé",
    span: { start: 3, end: 11 },
    anchor: "exact",
    suggestion: "est tombé",
    explanation: "Auxiliaire.",
    question: partial.kind === "dialect_check" ? "Ça se dit ?" : null,
    ruleIfDialect: "On dit a tombé.",
    category: partial.kind === "standard" ? null : "auxiliaire",
    dlf: null,
    resourceIds: [],
    status: "open",
    dialectNoteId: null,
    isFocus: false,
    ...partial,
  });
}

async function seedSession() {
  return saveSession({
    promptText: "Écris.",
    promptConstraints: JSON.stringify({
      cefrLevel: "B1",
      dialect: DEFAULT_DIALECT,
    }),
    writingText: "Il a tombé.",
    evaluationJson: "{}",
    cefrLevel: "B1",
    localDate: "2026-11-16",
    status: "evaluated",
  });
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/dialect-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const noteBody = {
  rule: "On dit a tombé.",
  example: "Il a tombé dans l'eau.",
  scope: "word" as const,
  form: "a tombé",
  learnerForm: "a tombé",
  tutorSuggestion: "est tombé",
};

describe("POST /api/dialect-notes", () => {
  beforeEach(async () => {
    await db.delete(dialectNotes).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("creates a note and resolves the Correction in one transaction", async () => {
    const session = await seedSession();
    await saveCorrections(
      [correction(session.id, { id: "c-check", kind: "dialect_check" })],
      () => new Date(),
    );

    const response = await post({ ...noteBody, fromCorrectionId: "c-check" });
    expect(response.status).toBe(201);
    const body = await readResponseJson(response, DialectNoteCreateResponse);
    expect(body.note.rule).toBe("On dit a tombé.");
    expect(body.note.form).toBe("a tombé");
    expect(body.note.scope).toBe("word");
    expect(body.correction?.status).toBe("confirmed_dialect");
    expect(body.correction?.dialectNoteId).toBe(body.note.id);

    const stored = await getCorrection("c-check");
    expect(stored?.status).toBe("confirmed_dialect");
    expect(stored?.dialectNoteId).toBe(body.note.id);
  });

  it("overturns an open mistake and returns 409 for already-resolved or standard", async () => {
    const session = await seedSession();
    await saveCorrections(
      [
        correction(session.id, { id: "c-mistake", kind: "mistake" }),
        correction(session.id, { id: "c-standard", kind: "standard" }),
        correction(session.id, {
          id: "c-done",
          kind: "dialect_check",
          status: "confirmed_dialect",
        }),
      ],
      () => new Date(),
    );

    const overturned = await post({
      ...noteBody,
      fromCorrectionId: "c-mistake",
    });
    expect(overturned.status).toBe(201);
    const saved = await readResponseJson(overturned, DialectNoteCreateResponse);
    expect(saved.correction?.status).toBe("overturned");

    const already = await post({ ...noteBody, fromCorrectionId: "c-done" });
    expect(already.status).toBe(409);
    expect((await readResponseJson(already, ErrorEnvelope)).error.code).toBe(
      "CONFLICT",
    );

    const standard = await post({
      ...noteBody,
      fromCorrectionId: "c-standard",
    });
    expect(standard.status).toBe(409);
    expect((await readResponseJson(standard, ErrorEnvelope)).error.code).toBe(
      "CONFLICT",
    );

    const notes = await db.select().from(dialectNotes);
    expect(notes).toHaveLength(1);
  });

  it("returns 404 for an unknown correction id and 422 for a short rule", async () => {
    const missing = await post({ ...noteBody, fromCorrectionId: "missing" });
    expect(missing.status).toBe(404);
    expect((await readResponseJson(missing, ErrorEnvelope)).error.code).toBe(
      "NOT_FOUND",
    );

    const short = await post({ ...noteBody, rule: "ab" });
    expect(short.status).toBe(422);
    expect((await readResponseJson(short, ErrorEnvelope)).error.code).toBe(
      "VALIDATION",
    );
  });
});
