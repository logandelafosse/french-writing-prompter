import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { levelChanges } from "@/db/schema";
import { LevelUndoResponse } from "@/contracts/api";
import { ErrorEnvelope } from "@/contracts/errors";
import { readResponseJson } from "@/test/read-response-json";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { POST } from "./route";

async function clearLevelChanges() {
  await db.delete(levelChanges).execute();
}

function postUndo(changeId: number) {
  return POST(
    new Request("http://localhost/api/level/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId }),
    }),
  );
}

describe("POST /api/level/undo", () => {
  beforeEach(async () => {
    await clearLevelChanges();
  });

  it("returns 404 when the change id does not exist", async () => {
    const response = await postUndo(99999);
    expect(response.status).toBe(404);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 409 when undo targets a manual change", async () => {
    const manual = await setLevel("B1", "manual");

    const response = await postUndo(manual.id);
    expect(response.status).toBe(409);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 200 and reverts the latest auto advancement", async () => {
    await setLevel("B1", "manual");
    const auto = await setLevel("B2", "auto");

    const response = await postUndo(auto.id);
    expect(response.status).toBe(200);
    const body = await readResponseJson(response, LevelUndoResponse);
    expect(body.change.source).toBe("undo");
    expect(body.change.toLevel).toBe("B1");
    expect(body.change.revertsChangeId).toBe(auto.id);
  });
});
