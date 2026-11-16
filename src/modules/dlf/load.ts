import "server-only";
import fs from "node:fs";
import { getEnv } from "@/server/env";
import { dlfIndexFromText, emptyDlfIndex, type DlfIndex } from "./lookup";

export function loadDlfLexicon(filePath: string | null): DlfIndex {
  if (filePath === null || filePath.length === 0) return emptyDlfIndex();
  let text: string;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return emptyDlfIndex();
  }
  return dlfIndexFromText(text);
}

type CachedIndex = { path: string | null; index: DlfIndex };

let cached: CachedIndex | undefined;

export function getDlfIndex(): DlfIndex {
  const filePath = getEnv().DLF_LEXICON_PATH ?? null;
  const path = filePath !== null && filePath.length > 0 ? filePath : null;
  if (cached !== undefined && cached.path === path) return cached.index;
  const index = loadDlfLexicon(path);
  cached = { path, index };
  return index;
}
