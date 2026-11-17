import { NextResponse } from "next/server";
import { getDlfIndex } from "@/modules/dlf/load";
import {
  PlacementService,
  type PlacementFailure,
} from "@/modules/placement-test/placement-store";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";

export function placementService(request?: Request) {
  return new PlacementService({
    client: getAiClient(request ? scenarioFromRequest(request) : "happy"),
    dlf: getDlfIndex(),
  });
}

export function placementErrorResponse(result: PlacementFailure) {
  const status =
    result.code === "NOT_FOUND" ? 404 : result.code === "CONFLICT" ? 409 : 422;
  return NextResponse.json(
    { error: { code: result.code, message: result.message } },
    { status },
  );
}
