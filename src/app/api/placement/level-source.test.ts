import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { levelChanges } from "@/db/schema";
import { LevelSource } from "@/contracts/cefr";

describe("placement completion level write", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    await db.delete(levelChanges).execute();
  });

  it("writes placement source on completion", async () => {
    const { POST } = await import("./route");
    await POST(
      new Request("http://localhost/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      }),
    );

    for (let step = 0; step < 3; step += 1) {
      await POST(
        new Request("http://localhost/api/placement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            writing: `Texte ${step + 1}`,
          }),
        }),
      );
    }

    const rows = await db.select().from(levelChanges);
    const placement = rows.find((row) => row.source === "placement");
    expect(placement).toBeDefined();
    expect(LevelSource.safeParse(placement?.source).success).toBe(true);
  });
});
