export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface EvaluationResult {
  overallCefr: CefrLevel;
}

export interface LevelChange {
  fromLevel: CefrLevel | null;
  toLevel: CefrLevel;
  source: "auto" | "manual";
  createdAt: string;
}

const CEFR_ORDER: Record<CefrLevel, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
};

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function nextLevel(current: CefrLevel): CefrLevel | null {
  const idx = CEFR_ORDER[current];
  if (idx >= CEFR_LEVELS.length - 1) return null;
  return CEFR_LEVELS[idx + 1] ?? null;
}

export class CefrTracker {
  private currentLevel: CefrLevel | null = null;
  private consecutiveAbove: number = 0;
  private history: LevelChange[] = [];

  getLevel(): CefrLevel | null {
    return this.currentLevel;
  }

  setLevel(level: CefrLevel, source: "auto" | "manual"): LevelChange {
    const change: LevelChange = {
      fromLevel: this.currentLevel,
      toLevel: level,
      source,
      createdAt: new Date().toISOString(),
    };

    this.currentLevel = level;
    this.history.push(change);

    if (source === "manual") {
      this.consecutiveAbove = 0;
    }

    return change;
  }

  recordEvaluation(evalResult: EvaluationResult): LevelChange | null {
    if (!this.currentLevel) return null;

    const evalIdx = CEFR_ORDER[evalResult.overallCefr];
    const currentIdx = CEFR_ORDER[this.currentLevel];

    if (evalIdx <= currentIdx) {
      this.consecutiveAbove = 0;
      return null;
    }

    this.consecutiveAbove++;

    if (this.consecutiveAbove >= 3) {
      const promotion = nextLevel(this.currentLevel);
      if (promotion && promotion !== this.currentLevel) {
        const change = this.setLevel(promotion, "auto");
        this.consecutiveAbove = 0;
        return change;
      }
    }

    return null;
  }

  getHistory(): LevelChange[] {
    return [...this.history];
  }
}
