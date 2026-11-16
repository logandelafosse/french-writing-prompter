import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { corrections, dialectNotes, sessions } from "@/db/schema";
import { listNotesForMarkdown } from "@/modules/dialect/dialect-notes-store";
import { renderDialectMarkdown } from "@/modules/dialect/export-markdown";
import { LOUISIANA_RULES } from "@/modules/dialect/louisiana-rules";
import { quotaTimeZone } from "@/modules/quota-manager/quota-store";
import { exportDialectMarkdownToPath } from "../../../scripts/dialect-export";

describe("dialect:export script", () => {
  let outputDir = "";

  beforeEach(async () => {
    await db.delete(dialectNotes).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
    outputDir = await mkdtemp(path.join(os.tmpdir(), "dialect-export-"));
  });

  afterEach(async () => {
    if (outputDir.length > 0) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("writes the renderer output to the given path", async () => {
    await db.insert(dialectNotes).values([
      {
        rule: "On dit icitte.",
        example: "Viens icitte.",
        scope: "word",
        form: "icitte",
        createdAt: "2026-11-16T18:00:00.000Z",
        updatedAt: "2026-11-16T18:00:00.000Z",
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

    const outputPath = path.join(outputDir, "louisiana-french.md");
    await exportDialectMarkdownToPath(outputPath);

    const notes = await listNotesForMarkdown();
    const expected = renderDialectMarkdown(
      LOUISIANA_RULES,
      notes,
      quotaTimeZone(),
    );
    const body = await readFile(outputPath, "utf8");
    expect(body).toBe(expected);
    expect(body).toContain("On dit icitte.");
    expect(body).not.toContain("Note effacée.");
  });
});
