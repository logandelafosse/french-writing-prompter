import { NextResponse } from "next/server";
import { getQuotaState } from "@/modules/quota-manager/quota-store";

export async function GET() {
  const quota = await getQuotaState();
  return NextResponse.json(quota);
}
