import { getSessionDetail } from "@/modules/history-store/history-store";
import { quotaTimeZone } from "@/modules/quota-manager/quota-store";
import type { SessionDetail } from "@/contracts/session";

export async function loadEvaluatedSession(
  id: number,
): Promise<{ session: SessionDetail; timeZone: string } | null> {
  const session = await getSessionDetail(id);
  if (session === null || session.displayStatus !== "evaluated") return null;
  return { session, timeZone: quotaTimeZone() };
}
