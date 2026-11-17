import { getSessionDetail } from "@/modules/history-store/history-store";
import type { SessionDetail } from "@/contracts/session";

export async function loadEvaluatedSession(
  id: number,
): Promise<SessionDetail | null> {
  const session = await getSessionDetail(id);
  if (session === null || session.displayStatus !== "evaluated") return null;
  return session;
}
