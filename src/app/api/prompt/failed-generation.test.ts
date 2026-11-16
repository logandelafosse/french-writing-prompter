import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { ErrorEnvelope } from "@/contracts/errors";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { getQuotaState } from "@/modules/quota-manager/quota-store";
import { readResponseJson } from "@/test/read-response-json";
import { POST } from "./route";

describe(
  "failed generation does not consume quota",
  { concurrent: false },
  () => {
    beforeEach(async () => {
      vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
      await db.delete(sessions).execute();
      await setLevel("B1", "manual");
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns 502 AI_UNAVAILABLE and leaves used unchanged", async () => {
      const before = await getQuotaState();
      const response = await POST(
        new Request("http://localhost/api/prompt", {
          method: "POST",
          headers: { "x-e2e-scenario": "failure" },
        }),
      );
      expect(response.status).toBe(502);
      const body = await readResponseJson(response, ErrorEnvelope);
      expect(body.error.code).toBe("AI_UNAVAILABLE");
      const after = await getQuotaState();
      expect(after.used).toBe(before.used);
      expect(after.used).toBe(0);
    });
  },
);
