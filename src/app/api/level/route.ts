import { NextResponse } from "next/server";
import {
  getCurrentLevel,
  getLevelHistory,
  getStreakCount,
  setLevel,
} from "@/modules/cefr-tracker/level-store";
import { LevelPutBody } from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";
import { abandonInProgressPlacementRuns } from "@/modules/placement-test/placement-store";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getLevel() {
  const [level, history, streak] = await Promise.all([
    getCurrentLevel(),
    getLevelHistory(),
    getStreakCount(),
  ]);
  return NextResponse.json({ level, history, streak });
});

export const PUT = withErrors(async function putLevel(request: Request) {
  const parsed = await parseRequestBody(request, LevelPutBody);
  if (!parsed.ok) {
    return parsed.response;
  }

  const change = await setLevel(parsed.value.level, "manual");
  await abandonInProgressPlacementRuns();
  return NextResponse.json({ change });
});
