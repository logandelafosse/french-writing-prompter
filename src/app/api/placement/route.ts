import { NextResponse } from "next/server";
import { OpenAiClient } from "@/modules/openai-client/openai-client";
import { PromptGenerator } from "@/modules/prompt-generator/prompt-generator";
import { WritingEvaluator } from "@/modules/writing-evaluator/writing-evaluator";
import { PlacementTest } from "@/modules/placement-test/placement-test";
import { setLevel } from "@/modules/cefr-tracker/db-store";
import { PlacementPostBody } from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";

let placementTest: PlacementTest | null = null;

const openai = new OpenAiClient();
const promptGenerator = new PromptGenerator(openai);
const evaluator = new WritingEvaluator(openai);

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
    placementTest = new PlacementTest(
      promptGenerator,
      evaluator,
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
    await setLevel(result.finalLevel, "manual");
    return NextResponse.json({
      type: "complete",
      finalLevel: result.finalLevel,
      evaluations: result.evaluations,
    });
  }

  return NextResponse.json({
    type: "next_prompt",
    prompt: result.prompt,
    step: result.step,
  });
}
