import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  corrections,
  levelChanges,
  practiceRequests,
  sessions,
} from "@/db/schema";
import { Correction } from "@/contracts/correction";
import { ErrorEnvelope } from "@/contracts/errors";
import {
  PracticePinResponse,
  PromptPostResponse,
  WeaknessesGetResponse,
} from "@/contracts/api";
import { TodayGetResponse } from "@/contracts/today";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import {
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { parseStoredFocus } from "@/lib/parse-stored-focus";
import { readResponseJson } from "@/test/read-response-json";
import { POST as postPrompt } from "@/app/api/prompt/route";
import { GET as getToday } from "@/app/api/today/route";
import { GET as getWeaknesses } from "@/app/api/weaknesses/route";
import { DELETE, POST } from "./route";

const constraints = JSON.stringify({
  cefrLevel: "B1",
  dialect: DEFAULT_DIALECT,
});

function mistake(
  sessionId: number,
  id: string,
  category: Correction["category"],
  ordinal: number,
): Correction {
  return Correction.parse({
    id,
    sessionId,
    ordinal,
    kind: "mistake",
    quote: "les enfant",
    span: { start: 0, end: 11 },
    anchor: "exact",
    suggestion: "les enfants",
    explanation: "Accord.",
    question: null,
    ruleIfDialect: null,
    category,
    dlf: null,
    resourceIds: [],
    status: "open",
    dialectNoteId: null,
    isFocus: false,
  });
}

async function seedEvaluated(
  evaluatedAt: string,
  categories: Array<NonNullable<Correction["category"]>>,
) {
  const session = await saveSession({
    promptText: "Écris.",
    promptConstraints: constraints,
    writingText: "Les enfant jouent.",
    evaluationJson: "{}",
    cefrLevel: "B1",
    localDate: "2026-11-13",
    status: "evaluated",
  });
  await db
    .update(sessions)
    .set({ evaluatedAt })
    .where(eq(sessions.id, session.id));
  await saveCorrections(
    categories.map((category, index) =>
      mistake(
        session.id,
        `${session.id}-${category}-${String(index)}`,
        category,
        index + 1,
      ),
    ),
    () => new Date(evaluatedAt),
  );
}

function practiceRequest(method: "POST" | "DELETE", category: string) {
  const request = new Request(
    `http://localhost/api/weaknesses/${category}/practice`,
    { method },
  );
  const context = { params: Promise.resolve({ category }) };
  return method === "POST" ? POST(request, context) : DELETE(request, context);
}

describe(
  "POST/DELETE /api/weaknesses/:category/practice",
  { concurrent: false },
  () => {
    beforeEach(async () => {
      vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
      await db.delete(practiceRequests).execute();
      await db.delete(corrections).execute();
      await db.delete(sessions).execute();
      await db.delete(levelChanges).execute();
      await setLevel("B1", "manual");
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects an unknown category with 422", async () => {
      const response = await practiceRequest("POST", "not-a-category");
      expect(response.status).toBe(422);
      const body = await readResponseJson(response, ErrorEnvelope);
      expect(body.error.code).toBe("VALIDATION");
    });

    it("pins first in Focus, cancels the earlier pin, and prompt consumes it", async () => {
      await seedEvaluated("2026-11-13T18:00:00.000Z", [
        "infinitif_participe",
        "imparfait_pc",
        "accents",
      ]);
      await seedEvaluated("2026-11-12T18:00:00.000Z", [
        "infinitif_participe",
        "imparfait_pc",
      ]);

      const first = await practiceRequest("POST", "accents");
      expect(first.status).toBe(200);
      expect(await readResponseJson(first, PracticePinResponse)).toEqual({
        pinned: true,
      });

      const weak = await readResponseJson(
        await getWeaknesses(),
        WeaknessesGetResponse,
      );
      expect(weak.focus.map((item) => item.id)[0]).toBe("accents");
      expect(
        weak.weaknesses.find((row) => row.category === "accents")?.pinned,
      ).toBe(true);

      const today = await readResponseJson(await getToday(), TodayGetResponse);
      expect(today.pin).toBe("accents");
      expect(today.focus.map((item) => item.id)[0]).toBe("accents");

      const second = await practiceRequest("POST", "genre");
      expect(second.status).toBe(200);
      const weakAfter = await readResponseJson(
        await getWeaknesses(),
        WeaknessesGetResponse,
      );
      expect(weakAfter.focus.map((item) => item.id)[0]).toBe("genre");

      const pending = await db
        .select()
        .from(practiceRequests)
        .where(eq(practiceRequests.category, "accents"));
      expect(pending[0]?.cancelledAt).toEqual(expect.any(String));
      expect(pending[0]?.consumedSessionId).toBeNull();

      const posted = await postPrompt(
        new Request("http://localhost/api/prompt", { method: "POST" }),
      );
      expect(posted.status).toBe(200);
      const body = await readResponseJson(posted, PromptPostResponse);

      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, body.session.id));
      expect(parseStoredFocus(rows[0]?.focusJson)?.[0]).toBe("genre");

      const consumed = await db
        .select()
        .from(practiceRequests)
        .where(eq(practiceRequests.category, "genre"));
      expect(consumed[0]?.consumedSessionId).toBe(body.session.id);
      expect(consumed[0]?.cancelledAt).toBeNull();

      const weakConsumed = await readResponseJson(
        await getWeaknesses(),
        WeaknessesGetResponse,
      );
      expect(weakConsumed.weaknesses.every((row) => !row.pinned)).toBe(true);

      const unpin = await practiceRequest("DELETE", "genre");
      expect(await readResponseJson(unpin, PracticePinResponse)).toEqual({
        pinned: false,
      });
    });
  },
);
