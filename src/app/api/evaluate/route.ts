import { NextResponse } from "next/server";
import { OpenAiClient } from "@/modules/openai-client/openai-client";
import { WritingEvaluator } from "@/modules/writing-evaluator/writing-evaluator";
import { getSession, saveSession } from "@/modules/history-store/history-store";
import { getTracker } from "@/modules/cefr-tracker/tracker-store";
import type { CefrLevel } from "@/modules/cefr-tracker/cefr-tracker";

const openai = new OpenAiClient();
const evaluator = new WritingEvaluator(openai);

export async function POST(request: Request) {
  const body: { writing: string; sessionId: number } = await request.json();

  const session = await getSession(body.sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found." },
      { status: 404 }
    );
  }

  if (session.evaluationJson) {
    return NextResponse.json(
      { error: "This prompt has already been evaluated." },
      { status: 409 }
    );
  }

  const promptConstraints = JSON.parse(session.promptConstraints);

  const evaluation = await evaluator.evaluate(
    body.writing,
    { text: session.promptText, constraints: promptConstraints },
    "louisiana"
  );

  await saveSession({
    promptText: session.promptText,
    promptConstraints: session.promptConstraints,
    writingText: body.writing,
    evaluationJson: JSON.stringify(evaluation),
    cefrLevel: evaluation.overall_cefr,
    id: body.sessionId,
  });

  const tracker = getTracker();
  if (!tracker.getLevel()) {
    await tracker.setLevel("A2", "manual");
  }

  const advancement = tracker.recordEvaluation({
    overallCefr: evaluation.overall_cefr as CefrLevel,
  });

  if (advancement) {
    const { setTrackerLevel } = await import(
      "@/modules/cefr-tracker/tracker-store"
    );
    await setTrackerLevel(advancement.toLevel, "auto");
  }

  return NextResponse.json({ evaluation, advancement });
}
