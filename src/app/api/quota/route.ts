import { NextResponse } from "next/server";
import { getTodayQuota } from "@/modules/quota-manager/quota-store";

export async function GET() {
  const used = await getTodayQuota();
  const remaining = Math.max(0, 3 - used);
  return NextResponse.json({ used, remaining, max: 3 });
}
