import { z } from "zod";

export const DlfExample = z.object({
  louisiana_french_text: z.string(),
  translation: z.string(),
});
export type DlfExample = z.infer<typeof DlfExample>;

export const DlfSense = z.object({
  pos: z.string(),
  glosses: z.array(z.string()),
  examples: z.array(DlfExample),
});
export type DlfSense = z.infer<typeof DlfSense>;

export const DlfLexiconEntry = z.object({
  id: z.string(),
  headword: z.string(),
  forms: z.array(z.string()),
  senses: z.array(DlfSense),
});
export type DlfLexiconEntry = z.infer<typeof DlfLexiconEntry>;

export const DlfLexicon = z.object({
  version: z.string(),
  entries: z.array(DlfLexiconEntry),
});
export type DlfLexicon = z.infer<typeof DlfLexicon>;
