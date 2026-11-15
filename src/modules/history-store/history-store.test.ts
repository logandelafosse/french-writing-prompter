import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  saveSession,
  getSession,
  getAllSessions,
  sessionCount,
} from "./history-store";
import { sessions } from "@/db/schema";

async function clearSessions() {
  await db.delete(sessions).execute();
}

describe("HistoryStore", () => {
  beforeEach(async () => {
    await clearSessions();
  });

  it("saves and retrieves a session", async () => {
    const session = await saveSession({
      promptText: "Décrivez votre chien.",
      promptConstraints: JSON.stringify({
        cefrLevel: "A1",
        dialect: "louisiana",
      }),
      writingText: "Mon chien est petit et brun.",
      evaluationJson: null,
      cefrLevel: "A1",
    });

    expect(session.id).toBeGreaterThan(0);

    const retrieved = await getSession(session.id);
    expect(retrieved).not.toBeNull();
    if (retrieved === null) throw new Error("expected session");
    expect(retrieved.promptText).toBe("Décrivez votre chien.");
    expect(retrieved.writingText).toBe("Mon chien est petit et brun.");
  });

  it("returns all sessions ordered by most recent first", async () => {
    await saveSession({
      promptText: "First",
      promptConstraints: "{}",
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A1",
    });

    await new Promise((r) => setTimeout(r, 10));

    await saveSession({
      promptText: "Second",
      promptConstraints: "{}",
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A2",
    });

    const all = await getAllSessions();
    expect(all).toHaveLength(2);
    const [newest, oldest] = all;
    expect(newest?.promptText).toBe("Second");
    expect(oldest?.promptText).toBe("First");
  });

  it("counts sessions correctly", async () => {
    expect(await sessionCount()).toBe(0);

    await saveSession({
      promptText: "A",
      promptConstraints: "{}",
      writingText: null,
      evaluationJson: null,
      cefrLevel: "B1",
    });

    expect(await sessionCount()).toBe(1);
  });

  it("updates a session with evaluation", async () => {
    const session = await saveSession({
      promptText: "Test",
      promptConstraints: "{}",
      writingText: null,
      evaluationJson: null,
      cefrLevel: "A1",
    });

    await saveSession({
      promptText: "Test",
      promptConstraints: "{}",
      writingText: "My writing",
      evaluationJson: '{"score": 5}',
      cefrLevel: "A2",
      id: session.id,
    });

    const updated = await getSession(session.id);
    expect(updated).not.toBeNull();
    if (updated === null) throw new Error("expected session");
    expect(updated.writingText).toBe("My writing");
    expect(updated.evaluationJson).toBe('{"score": 5}');
    expect(updated.cefrLevel).toBe("A2");
  });

  it("throws when updating a session that does not exist", async () => {
    await expect(
      saveSession({
        promptText: "Ghost",
        promptConstraints: "{}",
        writingText: null,
        evaluationJson: null,
        cefrLevel: "A1",
        id: 99_999,
      }),
    ).rejects.toThrow(/No row found: session id 99999/);
  });
});
