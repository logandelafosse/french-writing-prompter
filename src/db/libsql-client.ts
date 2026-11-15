import { createClient, type Client } from "@libsql/client";
import { assertVitestDatabaseUrl } from "./database-url";
import { getEnv } from "@/server/env";

export function createLibsqlClient(url: string): Client {
  assertVitestDatabaseUrl(url, Boolean(getEnv().VITEST));
  return createClient({ url });
}
