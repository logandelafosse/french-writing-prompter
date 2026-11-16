import { NextResponse } from "next/server";
import { WeaknessesGetResponse } from "@/contracts/api";
import { toFocusItems } from "@/modules/dialect/taxonomy";
import { toWeaknessDto } from "@/modules/weakness-service/aggregate";
import { computeFocus } from "@/modules/weakness-service/compute-focus";
import { listRankedWeaknesses } from "@/modules/weakness-service/weakness-store";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getWeaknesses() {
  const ranked = await listRankedWeaknesses();
  const focus = toFocusItems(computeFocus(ranked, null));
  return NextResponse.json(
    WeaknessesGetResponse.parse({
      weaknesses: ranked.map(toWeaknessDto),
      focus,
    }),
  );
});
