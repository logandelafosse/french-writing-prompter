import { NextResponse } from "next/server";
import { getQuotaState } from "@/modules/quota-manager/quota-store";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getQuota() {
  const quota = await getQuotaState();
  return NextResponse.json(quota);
});
