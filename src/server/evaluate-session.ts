import { NextResponse } from "next/server";
import { DRAFT_TEXT_MAX } from "@/config/limits";
import { EvaluatePostResponse } from "@/contracts/api";
import { parseCefrLevel } from "@/contracts/cefr";
import { PromptConstraints } from "@/contracts/prompt";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { parseStoredPromptMeta } from "@/lib/parse-stored-prompt-meta";
import { parseJson } from "@/lib/json";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";
import { WritingEvaluator } from "@/modules/writing-evaluator/writing-evaluator";
import { postProcessEvaluation } from "@/modules/writing-evaluator/post-process";
import {
  getSession,
  rememberWriting,
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import {
  getCurrentLevel,
  recordEvaluation,
} from "@/modules/cefr-tracker/level-store";

function evaluateError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  if (code === "ALREADY_EVALUATED" || code === "NOT_FOUND") {
    return NextResponse.json({ error: message, code }, { status });
  }
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function runEvaluate(
  sessionId: number,
  rawText: string,
  request: Request,
  now: () => Date = () => new Date(),
): Promise<Response> {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length === 0 || text.length > DRAFT_TEXT_MAX) {
    return evaluateError(
      422,
      "VALIDATION",
      "Le texte doit contenir entre 1 et 20 000 caractères.",
    );
  }

  const session = await getSession(sessionId);
  if (!session) {
    return evaluateError(404, "NOT_FOUND", "Session not found.");
  }
  if (session.status === "evaluated" || session.evaluationJson) {
    return evaluateError(
      409,
      "ALREADY_EVALUATED",
      "This prompt has already been evaluated.",
    );
  }

  const level = await getCurrentLevel();
  if (level === null) {
    return evaluateError(
      400,
      "NO_LEVEL",
      "Aucun niveau n'est défini. Choisis ton niveau avant d'envoyer ton texte.",
    );
  }

  await rememberWriting(sessionId, text, now().toISOString());

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

  const promptMeta = parseStoredPromptMeta(session.promptMetaJson);
  const raw = await new WritingEvaluator(
    getAiClient(scenarioFromRequest(request)),
  ).evaluate(
    text,
    promptMeta
      ? { text: session.promptText, meta: promptMeta, constraints }
      : { text: session.promptText, constraints },
    DEFAULT_DIALECT,
  );

  const processed = postProcessEvaluation(raw, {
    text,
    sessionId,
    now,
    createId: () => crypto.randomUUID(),
  });

  await saveSession({
    promptText: session.promptText,
    promptConstraints: session.promptConstraints,
    writingText: text,
    evaluationJson: JSON.stringify(processed.evaluation),
    evaluationRaw: JSON.stringify(raw),
    cefrLevel: processed.evaluation.overallCefr,
    id: sessionId,
  });
  await saveCorrections(processed.corrections, now);
  const advancement = await recordEvaluation(processed.evaluation.overallCefr);
  return NextResponse.json(
    EvaluatePostResponse.parse({
      session: {
        id: sessionId,
        createdAt: session.createdAt,
        promptText: session.promptText,
        writingText: text,
        promptLevel: parseCefrLevel(session.promptLevel),
        status: "evaluated",
        cefrLevel: processed.evaluation.overallCefr,
      },
      evaluation: processed.evaluation,
      corrections: processed.corrections,
      advancement,
    }),
  );
}
