import { NextResponse } from "next/server";
import { getCurrentLevel, getLevelHistory } from "@/modules/cefr-tracker/db-store";
import { setTrackerLevel } from "@/modules/cefr-tracker/tracker-store";
import type { CefrLevel } from "@/modules/cefr-tracker/cefr-tracker";

export async function GET() {
  const level = await getCurrentLevel();
  const history = await getLevelHistory();
  return NextResponse.json({ level, history });
}

export async function PUT(request: Request) {
  const body: { level: CefrLevel; source: "auto" | "manual" } = await request.json();
  const change = await setTrackerLevel(body.level, body.source);
  return NextResponse.json({ change });
}
