import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  corrections,
  levelChanges,
  placementRuns,
  sessions,
} from "@/db/schema";
import { ErrorEnvelope } from "@/contracts/errors";
import {
  PlacementGetResponse,
  PlacementStartResponse,
  PlacementSubmitResponse,
} from "@/contracts/placement";
import { LevelPutResponse, QuotaGetResponse } from "@/contracts/api";
import { readResponseJson } from "@/test/read-response-json";
import { GET as getPlacement } from "./route";
import { POST as postStart } from "./start/route";
import { POST as postSubmit } from "./[runId]/submit/route";
import { PUT as putLevel } from "@/app/api/level/route";
import { PUT as putDraft } from "@/app/api/sessions/[id]/draft/route";
import { GET as getQuota } from "@/app/api/quota/route";
import { clearEnvCache } from "@/server/env";

const WRITING = "Maintenant je vas. Les enfant jouent au parc.";

async function resetDb() {
  await db.delete(corrections).execute();
  await db.delete(sessions).execute();
  await db.delete(placementRuns).execute();
  await db.delete(levelChanges).execute();
}

function startRequest() {
  return new Request("http://localhost/api/placement/start", {
    method: "POST",
  });
}

function submitRequest(runId: number, body: unknown, scenario?: string) {
  return new Request(`http://localhost/api/placement/${runId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(scenario === undefined ? {} : { "x-e2e-scenario": scenario }),
    },
    body: JSON.stringify(body),
  });
}

function submitParams(runId: number) {
  return { params: Promise.resolve({ runId: String(runId) }) };
}

describe("placement routes › start conflicts when a level is set", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("returns 409 CONFLICT when a CEFR Level already exists", async () => {
    const level = await putLevel(
      new Request("http://localhost/api/level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "B1" }),
      }),
    );
    expect(level.status).toBe(200);
    await readResponseJson(level, LevelPutResponse);

    const response = await postStart(startRequest());
    expect(response.status).toBe(409);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns the existing run and inserts no row when one is in progress", async () => {
    const first = await postStart(startRequest());
    expect(first.status).toBe(201);
    const created = await readResponseJson(first, PlacementStartResponse);

    const second = await postStart(startRequest());
    expect(second.status).toBe(200);
    const again = await readResponseJson(second, PlacementStartResponse);
    expect(again.run.id).toBe(created.run.id);

    const rows = await db.select().from(placementRuns);
    expect(rows).toHaveLength(1);
  });
});

describe("placement routes › submit validation and failures", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("returns 409 CONFLICT for the wrong sessionId or step", async () => {
    const started = await readResponseJson(
      await postStart(startRequest()),
      PlacementStartResponse,
    );
    const unknown = await postSubmit(
      submitRequest(started.run.id, { sessionId: 9999, text: WRITING }),
      submitParams(started.run.id),
    );
    expect(unknown.status).toBe(409);
    expect((await readResponseJson(unknown, ErrorEnvelope)).error.code).toBe(
      "CONFLICT",
    );

    const afterOne = await readResponseJson(
      await postSubmit(
        submitRequest(started.run.id, {
          sessionId: started.run.session.id,
          text: WRITING,
        }),
        submitParams(started.run.id),
      ),
      PlacementSubmitResponse,
    );
    const staleStep = await postSubmit(
      submitRequest(afterOne.run.id, {
        sessionId: started.run.session.id,
        text: WRITING,
      }),
      submitParams(afterOne.run.id),
    );
    expect(staleStep.status).toBe(409);
    expect((await readResponseJson(staleStep, ErrorEnvelope)).error.code).toBe(
      "CONFLICT",
    );
  });

  it("returns 422 VALIDATION for empty text", async () => {
    const started = await readResponseJson(
      await postStart(startRequest()),
      PlacementStartResponse,
    );
    const response = await postSubmit(
      submitRequest(started.run.id, {
        sessionId: started.run.session.id,
        text: "   ",
      }),
      submitParams(started.run.id),
    );
    expect(response.status).toBe(422);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("keeps writing_text and step when evaluation fails", async () => {
    const started = await readResponseJson(
      await postStart(startRequest()),
      PlacementStartResponse,
    );
    const response = await postSubmit(
      submitRequest(
        started.run.id,
        { sessionId: started.run.session.id, text: WRITING },
        "failure",
      ),
      submitParams(started.run.id),
    );
    expect(response.status).toBe(502);
    const body = await readResponseJson(response, ErrorEnvelope);
    expect(body.error.code).toBe("AI_UNAVAILABLE");

    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.writingText).toBe(WRITING);
    expect(rows[0]?.evaluationJson).toBeNull();

    const current = await readResponseJson(
      await getPlacement(),
      PlacementGetResponse,
    );
    expect(current.run?.status).toBe("in_progress");
    expect(current.run?.step).toBe(1);
  });
});

describe("placement routes › PUT /api/level abandons an in-progress run", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("marks the run abandoned and GET returns run null", async () => {
    await postStart(startRequest());
    const put = await putLevel(
      new Request("http://localhost/api/level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "A2" }),
      }),
    );
    expect(put.status).toBe(200);

    const rows = await db.select().from(placementRuns);
    expect(rows[0]?.status).toBe("abandoned");

    const sessionRows = await db.select().from(sessions);
    expect(sessionRows).toHaveLength(1);
    expect(sessionRows[0]?.status).toBe("abandoned");
    expect(sessionRows[0]?.abandonedAt).toBeTruthy();

    const current = await readResponseJson(
      await getPlacement(),
      PlacementGetResponse,
    );
    expect(current.run).toBeNull();
  });
});

describe("placement routes › quota after a full run", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("leaves daily quota remaining at 3", async () => {
    let run = (
      await readResponseJson(
        await postStart(startRequest()),
        PlacementStartResponse,
      )
    ).run;
    for (let step = 0; step < 3; step += 1) {
      const submitted = await postSubmit(
        submitRequest(run.id, { sessionId: run.session.id, text: WRITING }),
        submitParams(run.id),
      );
      const body = await readResponseJson(submitted, PlacementSubmitResponse);
      run = body.run;
    }
    const quota = await readResponseJson(await getQuota(), QuotaGetResponse);
    expect(quota.remaining).toBe(3);
  });
});

describe("placement routes › resume draft after restart", () => {
  beforeEach(async () => {
    vi.stubEnv("AI_CLIENT", "fake");
    clearEnvCache();
    await resetDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it("GET returns step 2 with the saved draft", async () => {
    const started = await readResponseJson(
      await postStart(startRequest()),
      PlacementStartResponse,
    );
    await putDraft(
      new Request(
        `http://localhost/api/sessions/${started.run.session.id}/draft`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "brouillon étape 1" }),
        },
      ),
      { params: Promise.resolve({ id: String(started.run.session.id) }) },
    );
    const afterOne = await readResponseJson(
      await postSubmit(
        submitRequest(started.run.id, {
          sessionId: started.run.session.id,
          text: WRITING,
        }),
        submitParams(started.run.id),
      ),
      PlacementSubmitResponse,
    );
    await putDraft(
      new Request(
        `http://localhost/api/sessions/${afterOne.run.session.id}/draft`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "brouillon étape 2" }),
        },
      ),
      { params: Promise.resolve({ id: String(afterOne.run.session.id) }) },
    );

    const current = await readResponseJson(
      await getPlacement(),
      PlacementGetResponse,
    );
    expect(current.run?.step).toBe(2);
    expect(current.run?.session.writingText).toBe("brouillon étape 2");
  });
});
