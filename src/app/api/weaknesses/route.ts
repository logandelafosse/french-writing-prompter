import { NextResponse } from "next/server";
import { WeaknessesGetResponse } from "@/contracts/api";
import { listWeaknesses } from "@/modules/weakness-service/weakness-store";
import { withErrors } from "@/server/with-errors";

export const GET = withErrors(async function getWeaknesses() {
  const weaknesses = await listWeaknesses();
  return NextResponse.json(WeaknessesGetResponse.parse({ weaknesses }));
});
