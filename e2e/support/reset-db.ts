import { createClient } from "@libsql/client";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./.e2e/e2e.db";

export async function resetE2eDatabase(): Promise<void> {
  const client = createClient({ url: DATABASE_URL });
  try {
    await client.execute("DELETE FROM sessions");
    await client.execute("DELETE FROM daily_quota");
    await client.execute("DELETE FROM level_changes");
  } finally {
    client.close();
  }
}
