import { createClient, type Client } from "@libsql/client";
import { assertVitestDatabaseUrl } from "./database-url";

export function createLibsqlClient(url: string): Client {
  assertVitestDatabaseUrl(url);
  return createClient({ url });
}