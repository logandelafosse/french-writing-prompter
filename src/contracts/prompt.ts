import { z } from "zod";
import { CefrLevel } from "./cefr";

export const FrenchDialect = z.literal("louisiana");
export type FrenchDialect = z.infer<typeof FrenchDialect>;

export const PromptConstraints = z.object({
  cefrLevel: CefrLevel,
  dialect: FrenchDialect,
});

export type PromptConstraints = z.infer<typeof PromptConstraints>;
