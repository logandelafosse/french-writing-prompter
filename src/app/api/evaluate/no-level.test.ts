import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { levelChanges, sessions } from "@/db/schema";
import { saveSession } from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { ErrorEnvelope } from "@/contracts/errors";
import { readResponseJson } from "@/test/read-response-json";

const constraints = JSON.stringify({
  cefrLevel: "B1",
  dialect: DEFAULT_DIALECT,
});

describe("evaluate without a level", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
  });

  it("returns NO_LEVEL and writes no level_changes", async () => {
    const session = await saveSession({
      promptText: "Écris.",
      promptConstraints: constraints,
      writingText: null,
      evaluationJson: null,
      cefrLevel: "B1",
      localDate: "2026-11-16",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing: "Bonjour.", sessionId: session.id }),
      }),
    );
    expect(response.status).toBe(400);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("NO_LEVEL");

    const changes = await db.select().from(levelChanges);
    expect(changes).toHaveLength(0);
  });
});
