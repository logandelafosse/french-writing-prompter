import { z } from "zod";
import { MistakeCategory } from "./mistake-category";

export const WeaknessTrend = z.enum(["actif", "en_progres", "tranquille"]);
export type WeaknessTrend = z.infer<typeof WeaknessTrend>;

export const Weakness = z.strictObject({
  category: MistakeCategory,
  label: z.string(),
  count: z.number().int().positive(),
  lastSeenAt: z.string(),
  trend: WeaknessTrend,
  isFocus: z.boolean(),
  pinned: z.boolean(),
});
export type Weakness = z.infer<typeof Weakness>;
