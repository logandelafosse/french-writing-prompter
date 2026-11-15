import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function databaseUrlToFilePath(databaseUrl: string): string | null {
  if (!/^file:/i.test(databaseUrl)) {
    return null;
  }
  const rest = databaseUrl.replace(/^file:/i, "");
  if (rest.startsWith("//")) {
    const afterAuthority = rest.slice(2);
    if (afterAuthority.startsWith("/")) {
      return path.resolve(afterAuthority);
    }
    const slash = afterAuthority.indexOf("/");
    if (slash === -1) {
      return null;
    }
    return path.resolve(afterAuthority.slice(slash));
  }
  if (rest.startsWith("/")) {
    return path.resolve(rest);
  }
  return path.resolve(process.cwd(), rest);
}

export function assertVitestDatabaseUrl(url: string): void {
  if (!process.env.VITEST) {
    return;
  }

  const trimmed = url.trim();
  if (trimmed === ":memory:") {
    return;
  }

  const scheme = trimmed.split(":", 1)[0]?.toLowerCase();
  if (scheme === "libsql" || scheme === "http" || scheme === "https") {
    throw new Error(`Refusing to open ${url} under Vitest`);
  }

  if (/^file:/i.test(trimmed)) {
    const filePath = databaseUrlToFilePath(trimmed);
    if (!filePath) {
      throw new Error(`Refusing to open ${url} under Vitest`);
    }
    const resolved = path.resolve(filePath);
    const tmpRoot = path.resolve(os.tmpdir());
    const inTmp =
      resolved === tmpRoot || resolved.startsWith(`${tmpRoot}${path.sep}`);
    if (inTmp) {
      return;
    }
    throw new Error(`Refusing to open ${url} under Vitest`);
  }

  throw new Error(`Refusing to open ${url} under Vitest`);
}

export function fileDatabaseExists(databaseUrl: string): boolean {
  const filePath = databaseUrlToFilePath(databaseUrl);
  return filePath !== null && fs.existsSync(filePath);
}
