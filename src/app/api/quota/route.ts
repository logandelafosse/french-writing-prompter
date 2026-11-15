import { NextResponse } from "next/server";
import { getTodayQuota } from "@/modules/quota-manager/quota-store";
import { DAILY_PROMPT_QUOTA } from "@/config/limits";

export async function GET() {
  const used = await getTodayQuota();
  const remaining = Math.max(0, DAILY_PROMPT_QUOTA - used);
  return NextResponse.json({
    used,
    remaining,
    max: DAILY_PROMPT_QUOTA,
  });
}
