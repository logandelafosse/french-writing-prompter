import { CefrTracker, type CefrLevel, type LevelChange } from "./cefr-tracker";
import { setLevel as dbSetLevel } from "./db-store";

let trackerInstance: CefrTracker | null = null;

export function getTracker(): CefrTracker {
  if (!trackerInstance) {
    trackerInstance = new CefrTracker();
  }
  return trackerInstance;
}

export async function setTrackerLevel(
  level: CefrLevel,
  source: "auto" | "manual",
): Promise<LevelChange> {
  const change = await dbSetLevel(level, source);
  getTracker().setLevel(level, source);
  return change;
}
