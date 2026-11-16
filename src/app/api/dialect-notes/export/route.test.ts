import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { corrections, dialectNotes, sessions } from "@/db/schema";
import { listNotesForMarkdown } from "@/modules/dialect/dialect-notes-store";
import { renderDialectMarkdown } from "@/modules/dialect/export-markdown";
import { LOUISIANA_RULES } from "@/modules/dialect/louisiana-rules";
import { GET } from "./route";

describe("GET /api/dialect-notes/export", () => {
  beforeEach(async () => {
    await db.delete(dialectNotes).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("returns 200 markdown equal to the renderer output for the test DB", async () => {
    await db.insert(dialectNotes).values([
      {
        rule: "On dit asteur.",
        example: "Asteur, on part.",
        scope: "word",
        form: "asteur",
        learnerForm: "asteur",
        tutorSuggestion: "maintenant",
        createdAt: "2026-11-16T18:00:00.000Z",
        updatedAt: "2026-11-16T18:00:00.000Z",
        deletedAt: null,
      },
      {
        rule: "Avoir avec les verbes de mouvement.",
        example: "Il a tombé.",
        scope: "pattern",
        form: "a tombé",
        createdAt: "2026-11-14T18:00:00.000Z",
        updatedAt: "2026-11-14T18:00:00.000Z",
        deletedAt: null,
      },
      {
        rule: "Note effacée.",
        example: null,
        scope: "word",
        form: "gone",
        createdAt: "2026-11-15T18:00:00.000Z",
        updatedAt: "2026-11-15T18:00:00.000Z",
        deletedAt: "2026-11-16T12:00:00.000Z",
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/markdown/);

    const notes = await listNotesForMarkdown();
    const expected = renderDialectMarkdown(LOUISIANA_RULES, notes);
    expect(await response.text()).toBe(expected);
  });
});
