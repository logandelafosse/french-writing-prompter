import { NextResponse } from "next/server";
import {
  getCurrentLevel,
  getLevelHistory,
} from "@/modules/cefr-tracker/db-store";
import { setTrackerLevel } from "@/modules/cefr-tracker/tracker-store";
import { LevelPutBody } from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getLevel() {
  const level = await getCurrentLevel();
  const history = await getLevelHistory();
  return NextResponse.json({ level, history });
});

export const PUT = withErrors(async function putLevel(request: Request) {
  const parsed = await parseRequestBody(request, LevelPutBody);
  if (!parsed.ok) {
    return parsed.response;
  }

  const change = await setTrackerLevel(parsed.value.level, "manual");
  return NextResponse.json({ change });
});
