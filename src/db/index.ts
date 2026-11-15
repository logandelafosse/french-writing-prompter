import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "file:./data.db";
}

const url = databaseUrl();

if (process.env.VITEST && url.startsWith("file:")) {
  throw new Error(`Refusing to open ${url} under Vitest`);
}

const client = createClient({ url });

export const db = drizzle(client, { schema });