import fs from "node:fs";
import path from "node:path";
import { migrateWithBackup } from "../src/db/migrate-run";
import { assertE2eDatabaseUrl } from "../src/server/e2e-database";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";

process.env.DATABASE_URL = DATABASE_URL;
process.env.AI_CLIENT = "fake";
process.env.OPENAI_API_KEY = "";

const resolved = assertE2eDatabaseUrl(DATABASE_URL);
fs.mkdirSync(path.dirname(resolved), { recursive: true });

for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  const candidate = `${resolved}${suffix}`;
  if (fs.existsSync(candidate)) {
    fs.unlinkSync(candidate);
  }
}

async function main() {
  await migrateWithBackup(DATABASE_URL);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
