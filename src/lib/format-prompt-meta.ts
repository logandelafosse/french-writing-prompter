import type { PromptMeta } from "@/contracts/prompt-meta";

export function formatPromptMeta(meta: PromptMeta): string {
  const range = `${meta.wordTarget.min}–${meta.wordTarget.max} mots`;
  const parts = [meta.genre, meta.tense, range, meta.registre];
  const tone = meta.tone.trim();
  if (tone.length > 0 && tone.toLowerCase() !== meta.registre) {
    parts.push(tone);
  }
  return parts.join(" · ");
}
