import { NextResponse } from "next/server";
import { WeaknessesGetResponse } from "@/contracts/api";
import { toFocusItems } from "@/modules/dialect/taxonomy";
import { toWeaknessDto } from "@/modules/weakness-service/aggregate";
import { computeFocus } from "@/modules/weakness-service/compute-focus";
import { getPendingPin } from "@/modules/weakness-service/practice-store";
import { listRankedWeaknesses } from "@/modules/weakness-service/weakness-store";
import { learnerFocusNow } from "@/server/today/today";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getWeaknesses() {
  const ranked = await listRankedWeaknesses();
  const pin = await getPendingPin();
  const live = computeFocus(ranked, pin);
  const { focus: homeFocus } = await learnerFocusNow();
  const homeIds = new Set(homeFocus.map((item) => item.id));
  return NextResponse.json(
    WeaknessesGetResponse.parse({
      weaknesses: ranked.map((row) => toWeaknessDto(row, pin, homeIds)),
      focus: toFocusItems(live),
    }),
  );
});
