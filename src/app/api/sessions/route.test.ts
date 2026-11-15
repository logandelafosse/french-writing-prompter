import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { saveSession } from "@/modules/history-store/history-store";
import evaluationFixture from "@/test/fixtures/ai/evaluation.valid.json";
import { GET } from "./route";

async function clearSessions() {
  await db.delete(sessions).execute();
}

describe("GET /api/sessions", () => {
  beforeEach(async () => {
    await clearSessions();
  });

  it("returns one parsed view per row, including unreadable stored JSON", async () => {
    await saveSession({
      promptText: "Valid session",
      promptConstraints: JSON.stringify({
        cefrLevel: "B1",
        dialect: "louisiana",
      }),
      writingText: "Mon texte.",
      evaluationJson: JSON.stringify(evaluationFixture),
      cefrLevel: "B1",
    });

    await saveSession({
      promptText: "Residue legacy row",
      promptConstraints: "{}",
      writingText: "Garde mon texte.",
      evaluationJson: '{"score": 5}',
      cefrLevel: "A2",
    });

    await saveSession({
      promptText: "Broken JSON row",
      promptConstraints: JSON.stringify({
        cefrLevel: "A2",
        dialect: "louisiana",
      }),
      writingText: "Encore du texte.",
      evaluationJson: '"{oops"',
      cefrLevel: "A2",
    });

    const response = await GET();
    const body = await response.json();

    expect(body.sessions).toHaveLength(3);

    const valid = body.sessions.find(
      (s: { promptText: string }) => s.promptText === "Valid session",
    );
    expect(valid.evaluation).toEqual({ ok: true, value: evaluationFixture });
    expect(valid.promptLevel).toBe("B1");

    const residue = body.sessions.find(
      (s: { promptText: string }) => s.promptText === "Residue legacy row",
    );
    expect(residue.evaluation).toEqual({ ok: false, reason: "unreadable" });
    expect(residue.promptLevel).toBeNull();

    const broken = body.sessions.find(
      (s: { promptText: string }) => s.promptText === "Broken JSON row",
    );
    expect(broken.evaluation).toEqual({ ok: false, reason: "unreadable" });
    expect(broken.promptLevel).toBe("A2");
  });
});
