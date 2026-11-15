import { z } from "zod";
import { CefrLevel } from "./cefr";

export const DEFAULT_DIALECT = "louisiana" as const;

export const FrenchDialect = z.literal(DEFAULT_DIALECT);
export type FrenchDialect = z.infer<typeof FrenchDialect>;

export const PromptConstraints = z.object({
  cefrLevel: CefrLevel,
  dialect: FrenchDialect,
});

export type PromptConstraints = z.infer<typeof PromptConstraints>;
