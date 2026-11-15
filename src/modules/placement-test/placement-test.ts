import type { WritingPrompt, FrenchDialect } from "@/modules/prompt-generator/prompt-generator";
import type { Evaluation } from "@/modules/writing-evaluator/writing-evaluator";
import type { CefrLevel } from "@/modules/cefr-tracker/cefr-tracker";

export type PlacementTestState =
  | "idle"
  | "waiting_for_writing"
  | "complete";

export type SubmitResult =
  | { type: "next_prompt"; prompt: WritingPrompt; step: number }
  | { type: "complete"; finalLevel: CefrLevel; evaluations: Evaluation[] };

interface PromptGeneratorLike {
  generate(
    level: CefrLevel,
    dialect: FrenchDialect
  ): Promise<WritingPrompt>;
}

interface EvaluatorLike {
  evaluate(
    writing: string,
    prompt: WritingPrompt,
    dialect: FrenchDialect
  ): Promise<Evaluation>;
}

const CEFR_ORDER: Record<CefrLevel, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
};

const STARTING_LEVELS: CefrLevel[] = ["A2", "B1", "B2"];

export class PlacementTest {
  private state: PlacementTestState = "idle";
  private currentStep = 0;
  private evaluations: Evaluation[] = [];
  private currentPrompt: WritingPrompt | null = null;

  constructor(
    private promptGenerator: PromptGeneratorLike,
    private evaluator: EvaluatorLike,
    private dialect: FrenchDialect = "louisiana"
  ) {}

  getState(): PlacementTestState {
    return this.state;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  async start(): Promise<WritingPrompt> {
    if (this.state !== "idle") {
      throw new Error("Test already in progress");
    }

    this.state = "waiting_for_writing";
    this.currentStep = 1;
    this.evaluations = [];

    this.currentPrompt = await this.promptGenerator.generate(
      STARTING_LEVELS[0],
      this.dialect
    );

    return this.currentPrompt;
  }

  async submitWriting(writing: string): Promise<SubmitResult> {
    if (this.state !== "waiting_for_writing") {
      throw new Error("Test not in progress");
    }

    if (!writing.trim()) {
      throw new Error("Writing text is required");
    }

    if (!this.currentPrompt) {
      throw new Error("No active prompt");
    }

    const evaluation = await this.evaluator.evaluate(
      writing,
      this.currentPrompt,
      this.dialect
    );

    this.evaluations.push(evaluation);

    if (this.currentStep >= 3) {
      this.state = "complete";
      const finalLevel = PlacementTest.computeLevel(
        this.evaluations.map((e) => e.overall_cefr)
      );
      return {
        type: "complete",
        finalLevel,
        evaluations: [...this.evaluations],
      };
    }

    this.currentStep++;
    this.currentPrompt = await this.promptGenerator.generate(
      STARTING_LEVELS[this.currentStep - 1],
      this.dialect
    );

    return {
      type: "next_prompt",
      prompt: this.currentPrompt,
      step: this.currentStep,
    };
  }

  static computeLevel(cefrLevels: CefrLevel[]): CefrLevel {
    const sorted = [...cefrLevels].sort(
      (a, b) => CEFR_ORDER[a] - CEFR_ORDER[b]
    );
    return sorted[1];
  }
}
