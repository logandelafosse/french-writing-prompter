import { createClient } from "@libsql/client";
import { assertE2eDatabaseUrl } from "../../src/server/e2e-database";

export async function resetE2eDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";
  assertE2eDatabaseUrl(databaseUrl);
  const client = createClient({ url: databaseUrl });
  try {
    await client.execute("DELETE FROM sessions");
    await client.execute("DELETE FROM daily_quota");
    await client.execute("DELETE FROM level_changes");
  } finally {
    client.close();
  }
}
