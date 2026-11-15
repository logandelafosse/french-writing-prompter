import { isProductionPath } from "./classify-path";

export type AddedLinesByFile = Map<string, number>;

/** Parse `git diff --numstat` lines; only added lines in production paths count. */
export function parseNumstatAddedLines(numstatOutput: string): AddedLinesByFile {
  const byFile = new Map<string, number>();

  for (const line of numstatOutput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(trimmed);
    if (!match) continue;

    const addedRaw = match[1];
    const filePath = match[3];
    if (!filePath || addedRaw === "-" || addedRaw === undefined) continue;

    const added = Number(addedRaw);
    if (!Number.isFinite(added) || added <= 0) continue;
    if (!isProductionPath(filePath)) continue;

    byFile.set(filePath, (byFile.get(filePath) ?? 0) + added);
  }

  return byFile;
}

export function totalAddedLines(byFile: AddedLinesByFile): number {
  let total = 0;
  for (const n of byFile.values()) {
    total += n;
  }
  return total;
}