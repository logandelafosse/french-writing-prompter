import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { levelChanges } from "@/db/schema";
import { GET, PUT } from "./route";

async function clearLevelChanges() {
  await db.delete(levelChanges).execute();
}

describe("PUT /api/level", () => {
  beforeEach(async () => {
    await clearLevelChanges();
  });

  it("returns 400 for a body that includes source auto", async () => {
    const response = await PUT(
      new Request("http://localhost/api/level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "B1", source: "auto" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/source/i);

    const rows = await db.select().from(levelChanges);
    expect(rows).toHaveLength(0);
  });

  it("records a manual change when level is valid", async () => {
    const response = await PUT(
      new Request("http://localhost/api/level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "B1" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.change.source).toBe("manual");

    const rows = await db.select().from(levelChanges);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source).toBe("manual");
    expect(rows[0]?.toLevel).toBe("B1");
  });

  it("returns 400 naming the field for a malformed body", async () => {
    const response = await PUT(
      new Request("http://localhost/api/level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "Z9" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/level/i);

    const rows = await db.select().from(levelChanges);
    expect(rows).toHaveLength(0);
  });
});

describe("GET /api/level", () => {
  beforeEach(async () => {
    await clearLevelChanges();
  });

  it("returns current level and history", async () => {
    await PUT(
      new Request("http://localhost/api/level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "A2" }),
      }),
    );

    const response = await GET();
    const body = await response.json();
    expect(body.level).toBe("A2");
    expect(body.history).toHaveLength(1);
  });
});
