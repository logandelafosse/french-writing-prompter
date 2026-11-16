import { NextResponse } from "next/server";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";
import { withErrors } from "@/server/with-errors";
import { WritingEvaluator } from "@/modules/writing-evaluator/writing-evaluator";
import {
  getSession,
  rememberWriting,
  saveSession,
} from "@/modules/history-store/history-store";
import {
  getCurrentLevel,
  recordEvaluation,
} from "@/modules/cefr-tracker/level-store";
import { parseCefrLevel } from "@/contracts/cefr";
import { PromptConstraints } from "@/contracts/prompt";
import { EvaluatePostBody } from "@/contracts/api";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { parseJson } from "@/lib/json";
import { parseRequestBody } from "@/lib/http";

export const POST = withErrors(async function postEvaluate(request: Request) {
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

  if (session.status === "evaluated" || session.evaluationJson) {
    return NextResponse.json(
      {
        error: "This prompt has already been evaluated.",
        code: "ALREADY_EVALUATED",
      },
      { status: 409 },
    );
  }

  const level = await getCurrentLevel();
  if (level === null) {
    return NextResponse.json(
      {
        error: {
          code: "NO_LEVEL",
          message:
            "Aucun niveau n'est défini. Choisis ton niveau avant d'envoyer ton texte.",
        },
      },
      { status: 400 },
    );
  }

  await rememberWriting(body.sessionId, body.writing, new Date().toISOString());

  const constraintsResult = parseJson(
    PromptConstraints,
    session.promptConstraints,
  );
  const fallbackLevel =
    parseCefrLevel(session.promptLevel) ?? parseCefrLevel(session.cefrLevel);
  const constraints = constraintsResult.ok
    ? constraintsResult.value
    : {
        cefrLevel: fallbackLevel ?? level,
        dialect: DEFAULT_DIALECT,
      };

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

  const advancement = await recordEvaluation(evaluation.overall_cefr);

  return NextResponse.json({ evaluation, advancement });
});
