import { NextResponse } from "next/server";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";
import { PromptGenerator } from "@/modules/prompt-generator/prompt-generator";
import { WritingEvaluator } from "@/modules/writing-evaluator/writing-evaluator";
import { PlacementTest } from "@/modules/placement-test/placement-test";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import { PlacementPostBody } from "@/contracts/api";
import { toPlaceholderEvaluation } from "@/contracts/evaluation";
import { parseRequestBody } from "@/lib/http";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";

let placementTest: PlacementTest | null = null;

export function GET() {
  if (!placementTest) {
    return NextResponse.json({ state: "idle", step: 0 });
  }

  return NextResponse.json({
    state: placementTest.getState(),
    step: placementTest.getCurrentStep(),
  });
}

export async function POST(request: Request) {
  const parsed = await parseRequestBody(request, PlacementPostBody);
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.value;

  if (body.action === "start") {
    const client = getAiClient(scenarioFromRequest(request));
    placementTest = new PlacementTest(
      new PromptGenerator(client),
      new WritingEvaluator(client),
      DEFAULT_DIALECT,
    );
    const prompt = await placementTest.start();

    return NextResponse.json({
      type: "prompt",
      prompt,
      step: placementTest.getCurrentStep(),
    });
  }

  if (!placementTest) {
    return NextResponse.json(
      { error: "No active placement test." },
      { status: 400 },
    );
  }

  const result = await placementTest.submitWriting(body.writing);

  if (result.type === "complete") {
    await setLevel(result.finalLevel, "placement");
    return NextResponse.json({
      type: "complete",
      finalLevel: result.finalLevel,
      evaluations: result.evaluations.map(toPlaceholderEvaluation),
    });
  }

  return NextResponse.json({
    type: "next_prompt",
    prompt: result.prompt,
    step: result.step,
  });
}
