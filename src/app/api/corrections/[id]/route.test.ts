import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { corrections, sessions } from "@/db/schema";
import { Correction } from "@/contracts/correction";
import { CorrectionPatchResponse } from "@/contracts/api";
import { ErrorEnvelope } from "@/contracts/errors";
import {
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { PATCH } from "./route";

function mistake(sessionId: number, id = "c-open"): Correction {
  return Correction.parse({
    id,
    sessionId,
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
  });
}

async function seedSession() {
  return saveSession({
    promptText: "Écris.",
    promptConstraints: JSON.stringify({
      cefrLevel: "B1",
      dialect: DEFAULT_DIALECT,
    }),
    writingText: "Les enfant jouent.",
    evaluationJson: "{}",
    cefrLevel: "B1",
    localDate: "2026-11-16",
    status: "evaluated",
  });
}

function patch(id: string, action = "acknowledge") {
  return PATCH(
    new Request(`http://localhost/api/corrections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("PATCH /api/corrections/:id", () => {
  beforeEach(async () => {
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("acknowledge transition is allowed once for open mistakes", async () => {
    const session = await seedSession();
    await saveCorrections([mistake(session.id)], () => new Date());

    const first = await patch("c-open");
    expect(first.status).toBe(200);
    const body = await readResponseJson(first, CorrectionPatchResponse);
    expect(body.correction.status).toBe("acknowledged");
    expect(body.correction.id).toBe("c-open");

    const second = await patch("c-open");
    expect(second.status).toBe(409);
    const conflict = await readResponseJson(second, ErrorEnvelope);
    expect(conflict.error.code).toBe("CONFLICT");
  });

  it("returns 404 for an unknown id and 409 for an unknown transition", async () => {
    const session = await seedSession();
    const check = Correction.parse({
      ...mistake(session.id, "c-check"),
      kind: "dialect_check",
      question: "Ça se dit\u202F?",
    });
    await saveCorrections([check], () => new Date());

    const missing = await patch("missing");
    expect(missing.status).toBe(404);
    const notFound = await readResponseJson(missing, ErrorEnvelope);
    expect(notFound.error.code).toBe("NOT_FOUND");

    const forbidden = await patch("c-check");
    expect(forbidden.status).toBe(409);
    const conflict = await readResponseJson(forbidden, ErrorEnvelope);
    expect(conflict.error.code).toBe("CONFLICT");
  });

  it("reject_dialect turns an open dialect_check into confirmed_mistake", async () => {
    const session = await seedSession();
    const check = Correction.parse({
      ...mistake(session.id, "c-check"),
      kind: "dialect_check",
      question: "Ça se dit\u202F?",
    });
    await saveCorrections([check], () => new Date());

    const response = await patch("c-check", "reject_dialect");
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, CorrectionPatchResponse);
    expect(body.correction.status).toBe("confirmed_mistake");
    expect(body.correction.kind).toBe("dialect_check");
  });

  it("returns 409 when reject_dialect is applied to a mistake", async () => {
    const session = await seedSession();
    await saveCorrections([mistake(session.id)], () => new Date());

    const response = await patch("c-open", "reject_dialect");
    expect(response.status).toBe(409);
    const conflict = await readResponseJson(response, ErrorEnvelope);
    expect(conflict.error.code).toBe("CONFLICT");
  });
});
