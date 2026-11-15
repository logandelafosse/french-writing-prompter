import { NextResponse } from "next/server";
import {
  getCurrentLevel,
  getLevelHistory,
} from "@/modules/cefr-tracker/db-store";
import { setTrackerLevel } from "@/modules/cefr-tracker/tracker-store";
import { LevelPutBody } from "@/contracts/api";
import { parseRequestBody } from "@/lib/http";

export async function GET() {
  const level = await getCurrentLevel();
  const history = await getLevelHistory();
  return NextResponse.json({ level, history });
}

export async function PUT(request: Request) {
  const parsed = await parseRequestBody(request, LevelPutBody);
  if (!parsed.ok) {
    return parsed.response;
  }

  const change = await setTrackerLevel(parsed.value.level, "manual");
  return NextResponse.json({ change });
}
