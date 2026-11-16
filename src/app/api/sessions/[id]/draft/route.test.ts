import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { saveSession } from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { PUT } from "./route";

const DraftPutResponse = z.object({
  savedAt: z.string().min(1),
  wordCount: z.number().int(),
});

const DraftError = z.object({
  code: z.string(),
  error: z.string(),
});

const constraints = JSON.stringify({
  cefrLevel: "A2",
  dialect: DEFAULT_DIALECT,
});

function putDraft(id: number, text: string) {
  return PUT(
    new Request(`http://localhost/api/sessions/${id}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),
    { params: Promise.resolve({ id: String(id) }) },
  );
}

async function activeSession() {
  return saveSession({
    promptText: "Consigne",
    promptConstraints: constraints,
    writingText: null,
    evaluationJson: null,
    cefrLevel: "A2",
    localDate: "2026-11-16",
  });
}

describe("PUT /api/sessions/:id/draft", () => {
  beforeEach(async () => {
    await db.delete(sessions).execute();
  });

  it("saves text and writing_saved_at, and the last write wins", async () => {
    const session = await activeSession();
    const first = await putDraft(session.id, "ligne un\r\nligne deux");
    expect(first.status).toBe(200);
    const created = await readResponseJson(first, DraftPutResponse);
    expect(created.wordCount).toBe(4);

    const second = await putDraft(session.id, "fini");
    expect(second.status).toBe(200);
    const replaced = await readResponseJson(second, DraftPutResponse);
    expect(replaced.wordCount).toBe(1);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id));
    expect(rows[0]?.writingText).toBe("fini");
    expect(rows[0]?.writingSavedAt).toBe(replaced.savedAt);
  });

  it("normalises CRLF before saving", async () => {
    const session = await activeSession();
    const response = await putDraft(session.id, "ligne un\r\nligne deux");
    expect(response.status).toBe(200);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id));
    expect(rows[0]?.writingText).toBe("ligne un\nligne deux");
  });

  it("returns 409 NOT_ACTIVE for evaluated and abandoned sessions", async () => {
    const evaluated = await saveSession({
      promptText: "Déjà corrigé",
      promptConstraints: constraints,
      writingText: "Texte",
      evaluationJson: '{"score":5}',
      cefrLevel: "A2",
      localDate: "2026-11-16",
      status: "evaluated",
    });
    const abandoned = await saveSession({
      promptText: "Laissé",
      promptConstraints: constraints,
      writingText: "Brouillon",
      evaluationJson: null,
      cefrLevel: "A2",
      localDate: "2026-11-16",
      status: "abandoned",
    });

    const evaluatedResponse = await putDraft(evaluated.id, "nouveau");
    expect(evaluatedResponse.status).toBe(409);
    const evaluatedBody = await readResponseJson(evaluatedResponse, DraftError);
    expect(evaluatedBody.code).toBe("NOT_ACTIVE");

    const abandonedResponse = await putDraft(abandoned.id, "nouveau");
    expect(abandonedResponse.status).toBe(409);
    const abandonedBody = await readResponseJson(abandonedResponse, DraftError);
    expect(abandonedBody.code).toBe("NOT_ACTIVE");
  });

  it("returns 404 NOT_FOUND for an unknown id", async () => {
    const response = await putDraft(999_999, "texte");
    expect(response.status).toBe(404);
    const body = await readResponseJson(response, DraftError);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns 422 when the text is over 20 000 characters", async () => {
    const session = await activeSession();
    const response = await putDraft(session.id, "a".repeat(20_001));
    expect(response.status).toBe(422);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, session.id));
    expect(rows[0]?.writingText).toBeNull();
  });
});
