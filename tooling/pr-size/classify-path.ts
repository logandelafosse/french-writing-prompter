/**
 * Whether a repo-relative path counts toward the PR production line budget.
 * Pure function — exclusion list is reviewable in classify-path.test.ts.
 */
export function isProductionPath(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/");

  if (normalized === "package-lock.json") {
    return false;
  }

  if (normalized === "next-env.d.ts") {
    return false;
  }

  if (/\.test\.[^/]+$/.test(normalized)) {
    return false;
  }

  if (normalized.startsWith("src/test/")) {
    return false;
  }

  if (normalized.startsWith("e2e/")) {
    return false;
  }

  if (normalized.includes("/fixtures/") || normalized.includes("/__fixtures__/")) {
    return false;
  }

  if (normalized.startsWith("tooling/ast-grep/tests/")) {
    return false;
  }

  if (normalized.startsWith("docs/")) {
    return false;
  }

  if (normalized.endsWith(".md")) {
    return false;
  }

  if (normalized.startsWith("drizzle/")) {
    return false;
  }

  if (normalized.startsWith("src/data/")) {
    return false;
  }

  return true;
}