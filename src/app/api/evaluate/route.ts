import { NextResponse } from "next/server";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";
import { WritingEvaluator } from "@/modules/writing-evaluator/writing-evaluator";
import { getSession, saveSession } from "@/modules/history-store/history-store";
import { getTracker } from "@/modules/cefr-tracker/tracker-store";
import { parseCefrLevel } from "@/contracts/cefr";
import { PromptConstraints } from "@/contracts/prompt";
import { EvaluatePostBody } from "@/contracts/api";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { parseJson } from "@/lib/json";
import { parseRequestBody } from "@/lib/http";

export async function POST(request: Request) {
  const evaluator = new WritingEvaluator(
    getAiClient(scenarioFromRequest(request)),
  );
  const parsed = await parseRequestBody(request, EvaluatePostBody);
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.value;

  const session = await getSession(body.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.evaluationJson) {
    return NextResponse.json(
      { error: "This prompt has already been evaluated." },
      { status: 409 },
    );
  }

  const constraintsResult = parseJson(
    PromptConstraints,
    session.promptConstraints,
  );
  const fallbackLevel = parseCefrLevel(session.cefrLevel);
  const constraints = constraintsResult.ok
    ? constraintsResult.value
    : {
        cefrLevel: fallbackLevel ?? "A2",
        dialect: DEFAULT_DIALECT,
      };

  try {
    const evaluation = await evaluator.evaluate(
      body.writing,
      { text: session.promptText, constraints },
      DEFAULT_DIALECT,
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
      tracker.setLevel("A2", "manual");
    }

    const advancement = tracker.recordEvaluation({
      overallCefr: evaluation.overall_cefr,
    });

    if (advancement) {
      const { setTrackerLevel } =
        await import("@/modules/cefr-tracker/tracker-store");
      await setTrackerLevel(advancement.toLevel, "auto");
    }

    return NextResponse.json({ evaluation, advancement });
  } catch (error) {
    if (error instanceof AiOutputError) {
      return NextResponse.json(
        { error: "AI output was invalid.", code: error.code },
        { status: 502 },
      );
    }
    throw error;
  }
}
