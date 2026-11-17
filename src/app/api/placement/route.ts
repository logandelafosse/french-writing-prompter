import { NextResponse } from "next/server";
import { PlacementGetResponse } from "@/contracts/placement";
import { withErrors } from "@/server/with-errors";
import { placementService } from "./helpers";

export const GET = withErrors(async function getPlacement() {
  return NextResponse.json(
    PlacementGetResponse.parse(await placementService().getCurrent()),
  );
});
