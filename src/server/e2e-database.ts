import path from "node:path";
import { databaseUrlToFilePath } from "@/db/migrate-run";

export function assertE2eDatabaseUrl(databaseUrl: string): string {
  const filePath = databaseUrlToFilePath(databaseUrl);
  if (filePath === null) {
    throw new Error(`E2E requires a file: DATABASE_URL, got ${databaseUrl}`);
  }
  const resolved = path.resolve(filePath);
  const e2eDir = path.resolve(process.cwd(), ".e2e");
  if (resolved !== e2eDir && !resolved.startsWith(`${e2eDir}${path.sep}`)) {
    throw new Error(`Refusing to run e2e against database at ${resolved}`);
  }
  return resolved;
}
