import { CefrTracker, type CefrLevel, type LevelChange } from "./cefr-tracker";
import { getLevelHistory, setLevel as dbSetLevel } from "./db-store";

let trackerInstance: CefrTracker | null = null;

export function getTracker(): CefrTracker {
  if (!trackerInstance) {
    trackerInstance = new CefrTracker();
  }
  return trackerInstance;
}

export async function initTracker(): Promise<CefrTracker> {
  trackerInstance = new CefrTracker();
  const history = await getLevelHistory();

  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h === undefined) continue;
    trackerInstance.setLevel(h.toLevel, h.source);
  }

  return trackerInstance;
}

export async function setTrackerLevel(
  level: CefrLevel,
  source: "auto" | "manual"
): Promise<LevelChange> {
  const change = await dbSetLevel(level, source);
  getTracker().setLevel(level, source);
  return change;
}
