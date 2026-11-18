import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_ROUTE_MAX_DURATION } from "@/config/ai";
import {
  PlacementSubmitBody,
  PlacementSubmitResponse,
} from "@/contracts/placement";
import { parseRequestBody } from "@/lib/http";
import { withErrors } from "@/server/with-errors";
import { placementErrorResponse, placementService } from "../../route";

const RunId = z.coerce.number().int().positive();

export const maxDuration = 120 satisfies typeof AI_ROUTE_MAX_DURATION;

export const POST = withErrors(async function postPlacementSubmit(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const runId = RunId.safeParse((await context.params).runId);
  if (!runId.success) {
    return placementErrorResponse({
      ok: false,
      code: "NOT_FOUND",
      message: "Test de placement introuvable.",
    });
  }
  const parsed = await parseRequestBody(request, PlacementSubmitBody);
  if (!parsed.ok) return parsed.response;
  const result = await placementService(request).submit(
    runId.data,
    parsed.value,
  );
  if (!result.ok) return placementErrorResponse(result);
  const { view } = result;
  return NextResponse.json(
    PlacementSubmitResponse.parse(
      view.results ? { run: view, results: view.results } : { run: view },
    ),
  );
});
