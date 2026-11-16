import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { corrections, dialectNotes, sessions } from "@/db/schema";
import { DialectNotePatchResponse } from "@/contracts/api";
import { ErrorEnvelope } from "@/contracts/errors";
import { listActiveNotes } from "@/modules/dialect/dialect-notes-store";
import { buildEvaluatorPrompt } from "@/modules/writing-evaluator/build-evaluator-prompt";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { DELETE, PATCH } from "./route";

async function insertNote(partial: {
  rule?: string;
  deletedAt?: string | null;
}) {
  const createdAt = "2026-01-01T00:00:00.000Z";
  const inserted = await db.insert(dialectNotes).values({
    rule: partial.rule ?? "On dit a tombé.",
    example: "Il a tombé.",
    scope: "word",
    form: "tomber",
    createdAt,
    updatedAt: createdAt,
    deletedAt: partial.deletedAt ?? null,
  });
  return Number(inserted.lastInsertRowid);
}

function patchRequest(id: number, body: unknown) {
  return PATCH(
    new Request(`http://localhost/api/dialect-notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: String(id) }) },
  );
}

function deleteRequest(id: number | string) {
  return DELETE(new Request(`http://localhost/api/dialect-notes/${id}`), {
    params: Promise.resolve({ id: String(id) }),
  });
}

describe("PATCH /api/dialect-notes/:id", () => {
  beforeEach(async () => {
    await db.delete(dialectNotes).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("updates the rule, example, scope and form, and bumps updatedAt", async () => {
    const id = await insertNote({});
    const response = await patchRequest(id, {
      rule: "On dit icitte.",
      example: "Viens icitte.",
      scope: "pattern",
      form: "icitte",
    });
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, DialectNotePatchResponse);
    expect(body.note).toMatchObject({
      id,
      rule: "On dit icitte.",
      example: "Viens icitte.",
      scope: "pattern",
      form: "icitte",
    });
    expect(body.note.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(new Date(body.note.updatedAt).getTime()).toBeGreaterThan(
      new Date(body.note.createdAt).getTime(),
    );
  });

  it("returns 404 for unknown or deleted ids and 422 for a short rule", async () => {
    const missing = await patchRequest(999, { rule: "On dit icitte." });
    expect(missing.status).toBe(404);
    expect((await readResponseJson(missing, ErrorEnvelope)).error.code).toBe(
      "NOT_FOUND",
    );

    const deletedId = await insertNote({
      deletedAt: "2026-11-16T00:00:00.000Z",
    });
    const deleted = await patchRequest(deletedId, { rule: "On dit icitte." });
    expect(deleted.status).toBe(404);

    const id = await insertNote({});
    const short = await patchRequest(id, { rule: "ab" });
    expect(short.status).toBe(422);
    expect((await readResponseJson(short, ErrorEnvelope)).error.code).toBe(
      "VALIDATION",
    );
  });
});

describe("DELETE /api/dialect-notes/:id", () => {
  beforeEach(async () => {
    await db.delete(dialectNotes).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("returns 204, sets deletedAt, and drops the note from the evaluator prompt", async () => {
    const id = await insertNote({ rule: "On dit barbotte." });
    const response = await deleteRequest(id);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");

    const rows = await db.select().from(dialectNotes);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deletedAt).toEqual(expect.any(String));

    const active = await listActiveNotes();
    const built = buildEvaluatorPrompt({
      writing: "On a pris une barbotte.",
      promptText: "Consigne.",
      registre: null,
      dialect: DEFAULT_DIALECT,
      dialectNotes: active,
    });
    expect(built.system).not.toContain("barbotte");
    expect(built.system).not.toContain(
      "Formes confirmées par l'apprenant — ne les signale JAMAIS",
    );
  });
});
