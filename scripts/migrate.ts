import { migrateWithBackup } from "../src/db/migrate-run";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data.db";
  await migrateWithBackup(databaseUrl);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});