import { createClient, type Client } from "@libsql/client";
import { assertVitestDatabaseUrl } from "./database-url";
import { getEnv } from "@/server/env";

export function createLibsqlClient(url: string): Client {
  assertVitestDatabaseUrl(url, Boolean(getEnv().VITEST));
  // db.transaction() detaches a connection; shared cache keeps :memory: on one DB.
  const resolved = url === ":memory:" ? "file::memory:?cache=shared" : url;
  return createClient({ url: resolved });
}
