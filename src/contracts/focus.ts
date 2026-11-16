import { z } from "zod";
import { MistakeCategory } from "./mistake-category";

export const FocusItem = z.strictObject({
  id: MistakeCategory,
  name: z.string(),
  inlineName: z.string(),
  historyName: z.string(),
  shortName: z.string(),
});
export type FocusItem = z.infer<typeof FocusItem>;

export const FocusSnapshot = z.array(MistakeCategory);
export type FocusSnapshot = z.infer<typeof FocusSnapshot>;
