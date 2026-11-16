import { PromptMeta } from "@/contracts/prompt-meta";
import { parseJson } from "@/lib/json";

export function parseStoredPromptMeta(
  raw: string | null | undefined,
): PromptMeta | null {
  if (raw === null || raw === undefined || raw.length === 0) {
    return null;
  }
  const parsed = parseJson(PromptMeta, raw);
  if (!parsed.ok) {
    return null;
  }
  return parsed.value;
}
