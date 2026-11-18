import { createClient, type Client } from "@libsql/client";
import { assertVitestDatabaseUrl } from "./database-url";
import { getEnv } from "@/server/env";

export function createLibsqlClient(url: string): Client {
  const env = getEnv();
  assertVitestDatabaseUrl(url, Boolean(env.VITEST));
  // db.transaction() detaches a connection; shared cache keeps :memory: on one DB.
  const resolved = url === ":memory:" ? "file::memory:?cache=shared" : url;
  const authToken = env.LIBSQL_AUTH_TOKEN;
  if (authToken !== undefined && authToken.length > 0) {
    return createClient({ url: resolved, authToken });
  }
  return createClient({ url: resolved });
}
