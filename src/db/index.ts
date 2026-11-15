import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createLibsqlClient } from "./libsql-client";
import { getEnv } from "@/server/env";

type AppDatabase = LibSQLDatabase<typeof schema>;

let dbInstance: AppDatabase | undefined;

export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop) {
    dbInstance ??= drizzle(createLibsqlClient(getEnv().DATABASE_URL), {
      schema,
    });
    const value: unknown = Reflect.get(dbInstance, prop, dbInstance);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(dbInstance);
    }
    return value;
  },
});
