import { NextResponse } from "next/server";
import { LevelUndoBody, type LevelUndoResponse } from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";
import { withErrors } from "@/server/with-errors";
import {
  UndoLevelError,
  undoAutoAdvancement,
} from "@/modules/cefr-tracker/level-store";

export const POST = withErrors(async function postLevelUndo(request: Request) {
  const parsed = await parseRequestBody(request, LevelUndoBody);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const change = await undoAutoAdvancement(parsed.value.changeId);
    return NextResponse.json({ change } satisfies LevelUndoResponse);
  } catch (error) {
    if (error instanceof UndoLevelError) {
      if (error.code === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Changement introuvable." } },
          { status: 404 },
        );
      }
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Ce changement ne peut pas être annulé.",
          },
        },
        { status: 409 },
      );
    }
    throw error;
  }
});
