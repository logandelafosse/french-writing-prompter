import { NextResponse } from "next/server";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";
import { PromptGenerator } from "@/modules/prompt-generator/prompt-generator";
import {
  QuotaExhaustedError,
  assertQuotaAvailable,
  quotaTimeZone,
} from "@/modules/quota-manager/quota-store";
import { getCurrentLevel } from "@/modules/cefr-tracker/db-store";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { localDateKey } from "@/lib/dates";

let quotaPromptChain = Promise.resolve();

function withQuotaPromptLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = quotaPromptChain.then(fn, fn);
  quotaPromptChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function POST(request: Request) {
  const level = await getCurrentLevel();
  if (!level) {
    return NextResponse.json(
      { error: "No CEFR level set. Please set your level first." },
      { status: 400 },
    );
  }

  try {
    return await withQuotaPromptLock(async () => {
      await assertQuotaAvailable();

      const promptGenerator = new PromptGenerator(
        getAiClient(scenarioFromRequest(request)),
      );

      let prompt;
      try {
        prompt = await promptGenerator.generate(level, DEFAULT_DIALECT);
      } catch {
        return NextResponse.json(
          { error: "Prompt generation failed." },
          { status: 502 },
        );
      }

      const now = new Date().toISOString();
      const localDate = localDateKey(new Date(now), quotaTimeZone());

      const inserted = await db.insert(sessions).values({
        promptText: prompt.text,
        promptConstraints: JSON.stringify(prompt.constraints),
        writingText: null,
        evaluationJson: null,
        cefrLevel: level,
        createdAt: now,
        kind: "daily",
        localDate,
      });
      const sessionId = Number(inserted.lastInsertRowid);

      return NextResponse.json({ prompt, sessionId });
    });
  } catch (error) {
    if (error instanceof QuotaExhaustedError) {
      return NextResponse.json(
        {
          error: "QUOTA_EXHAUSTED",
          resetsAt: error.resetsAt,
        },
        { status: 429 },
      );
    }
    throw error;
  }
}
