import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createLibsqlClient } from "./libsql-client";

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "file:./data.db";
}

const client = createLibsqlClient(databaseUrl());

export const db = drizzle(client, { schema });