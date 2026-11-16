import { z } from "zod";

export const Registre = z.enum(["formel", "familier", "mixt"]);
export type Registre = z.infer<typeof Registre>;

export const PromptMeta = z.object({
  genre: z.string(),
  tense: z.string(),
  tone: z.string(),
  registre: Registre,
  wordTarget: z.object({ min: z.number().int(), max: z.number().int() }),
  topic: z.string(),
  topicTags: z.array(z.string()).max(3),
});

export type PromptMeta = z.infer<typeof PromptMeta>;

export const GeneratorModelOutput = z.object({
  text: z.string().min(150).max(1500),
  genre: z.string(),
  tense: z.string(),
  tone: z.string(),
  registre: Registre,
  topic: z.string(),
  topic_tags: z.array(z.string()).max(3),
});

export type GeneratorModelOutput = z.infer<typeof GeneratorModelOutput>;
