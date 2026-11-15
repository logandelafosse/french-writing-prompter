export class QuotaManager {
  private usedCount: number;

  constructor(usedCount: number = 0) {
    this.usedCount = usedCount;
  }

  canGenerate(): boolean {
    return this.usedCount < 3;
  }

  remaining(): number {
    return Math.max(0, 3 - this.usedCount);
  }

  consume(): void {
    if (!this.canGenerate()) {
      throw new Error("Daily quota exhausted");
    }
    this.usedCount++;
  }
}
