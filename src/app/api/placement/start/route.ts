import { NextResponse } from "next/server";
import { PlacementStartResponse } from "@/contracts/placement";
import { withErrors } from "@/server/with-errors";
import { placementErrorResponse, placementService } from "../helpers";

export const POST = withErrors(async function postPlacementStart(
  request: Request,
) {
  const result = await placementService(request).start();
  if (!result.ok) return placementErrorResponse(result);
  return NextResponse.json(PlacementStartResponse.parse({ run: result.view }), {
    status: result.created ? 201 : 200,
  });
});
