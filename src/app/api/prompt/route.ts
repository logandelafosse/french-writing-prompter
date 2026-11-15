import { NextResponse } from "next/server";
import { OpenAiClient } from "@/modules/openai-client/openai-client";
import { PromptGenerator } from "@/modules/prompt-generator/prompt-generator";
import {
  getTodayQuota,
  incrementQuota,
} from "@/modules/quota-manager/quota-store";
import { getCurrentLevel } from "@/modules/cefr-tracker/db-store";
import { saveSession } from "@/modules/history-store/history-store";
import { DAILY_PROMPT_QUOTA } from "@/config/limits";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";

const openai = new OpenAiClient();
const promptGenerator = new PromptGenerator(openai);

export async function POST() {
  const level = await getCurrentLevel();
  if (!level) {
    return NextResponse.json(
      { error: "No CEFR level set. Please set your level first." },
      { status: 400 },
    );
  }

  const used = await getTodayQuota();
  if (used >= DAILY_PROMPT_QUOTA) {
    return NextResponse.json(
      { error: "Daily quota exhausted. Try again tomorrow." },
      { status: 429 },
    );
  }

  const prompt = await promptGenerator.generate(level, DEFAULT_DIALECT);

  const session = await saveSession({
    promptText: prompt.text,
    promptConstraints: JSON.stringify(prompt.constraints),
    writingText: null,
    evaluationJson: null,
    cefrLevel: level,
  });

  await incrementQuota();

  return NextResponse.json({ prompt, sessionId: session.id });
}
