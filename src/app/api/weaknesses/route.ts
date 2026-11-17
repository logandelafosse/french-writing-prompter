import { NextResponse } from "next/server";
import { WeaknessesGetResponse } from "@/contracts/api";
import { toFocusItems } from "@/modules/dialect/taxonomy";
import { toWeaknessDto } from "@/modules/weakness-service/aggregate";
import { weaknessBoard } from "@/modules/weakness-service/board";
import { learnerFocusNow } from "@/server/today/today";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getWeaknesses() {
  const board = await weaknessBoard();
  const { focus: homeFocus } = await learnerFocusNow();
  const homeIds = new Set(homeFocus.map((item) => item.id));
  return NextResponse.json(
    WeaknessesGetResponse.parse({
      weaknesses: board.ranked.map((row) =>
        toWeaknessDto(row, board.pin, homeIds),
      ),
      focus: toFocusItems(board.focusIds),
    }),
  );
});
