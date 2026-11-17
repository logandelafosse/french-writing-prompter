import { z } from "zod";
import { NextResponse } from "next/server";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";
import { withErrors } from "@/server/with-errors";
import { WritingEvaluator } from "@/modules/writing-evaluator/writing-evaluator";
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
import { parseCefrLevel } from "@/contracts/cefr";
import { PromptConstraints } from "@/contracts/prompt";
import { EvaluatePostResponse, SessionEvaluatePostBody } from "@/contracts/api";
import { loadLearnerDialectContext } from "@/modules/dialect/learner-dialect-context";
import { parseJson } from "@/lib/json";
import { parseRequestBody } from "@/lib/http";
import { parseStoredFocus } from "@/lib/parse-stored-focus";
import { parseStoredPromptMeta } from "@/lib/parse-stored-prompt-meta";
import { DRAFT_TEXT_MAX } from "@/config/limits";

const SessionId = z.coerce.number().int().positive();

export const POST = withErrors(async function postSessionEvaluate(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const id = SessionId.safeParse((await context.params).id);
  if (!id.success) {
    return Response.json(
      { error: "Session not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const parsed = await parseRequestBody(request, SessionEvaluatePostBody);
  if (!parsed.ok) return parsed.response;

  const evaluator = new WritingEvaluator(
    getAiClient(scenarioFromRequest(request)),
  );

  const sessionId = id.data;
  const text = parsed.value.text.replace(/\r\n/g, "\n").trim();
  if (text.length === 0 || text.length > DRAFT_TEXT_MAX) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Le texte doit contenir entre 1 et 20 000 caractères.",
        },
      },
      { status: 422 },
    );
  }

  const session = await getSession(sessionId);
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

  await rememberWriting(sessionId, text, new Date().toISOString());

  const learnerDialect = await loadLearnerDialectContext();
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
        dialect: learnerDialect.dialect,
      };

  const promptMeta = parseStoredPromptMeta(session.promptMetaJson);
  const now = new Date();
  const evaluated = await evaluator.evaluate(
    text,
    promptMeta
      ? { text: session.promptText, meta: promptMeta, constraints }
      : { text: session.promptText, constraints },
    learnerDialect,
    {
      sessionId,
      now: () => now,
      createId: () => crypto.randomUUID(),
      focusCategories: parseStoredFocus(session.focusJson) ?? [],
    },
  );

  await saveSession({
    promptText: session.promptText,
    promptConstraints: session.promptConstraints,
    writingText: text,
    evaluationJson: JSON.stringify(evaluated.evaluation),
    evaluationRaw: JSON.stringify(evaluated.raw),
    cefrLevel: evaluated.evaluation.overallCefr,
    id: sessionId,
  });
  await saveCorrections(evaluated.corrections, () => now);

  const advancement = await recordEvaluation(evaluated.evaluation.overallCefr);

  return NextResponse.json(
    EvaluatePostResponse.parse({
      session: {
        id: sessionId,
        createdAt: session.createdAt,
        promptText: session.promptText,
        writingText: text,
        promptLevel: parseCefrLevel(session.promptLevel),
        status: "evaluated",
        cefrLevel: evaluated.evaluation.overallCefr,
      },
      evaluation: evaluated.evaluation,
      corrections: evaluated.corrections,
      advancement,
    }),
  );
});
