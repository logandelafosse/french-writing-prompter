import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db";
import { levelChanges } from "@/db/schema";

vi.mock("@/modules/openai-client/openai-client", () => ({
  OpenAiClient: class {
    chatCompletion = vi.fn();
    chatCompletionJSON = vi.fn();
  },
}));

async function clearLevelChanges() {
  await db.delete(levelChanges).execute();
}

describe("POST /api/placement body validation", () => {
  beforeEach(async () => {
    await clearLevelChanges();
  });

  it("returns 400 for an unknown action without writing level changes", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/action/i);

    const rows = await db.select().from(levelChanges);
    expect(rows).toHaveLength(0);
  });

  it("returns 400 when submit is missing writing", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/writing/i);
  });

  it("returns 400 for extra fields on start", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", extra: 1 }),
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/extra/i);

    const rows = await db.select().from(levelChanges);
    expect(rows).toHaveLength(0);
  });
});
