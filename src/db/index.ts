import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createLibsqlClient } from "./libsql-client";
import { getEnv } from "@/server/env";

type AppDatabase = LibSQLDatabase<typeof schema>;

let dbInstance: AppDatabase | undefined;

function getDbInstance(): AppDatabase {
  if (!dbInstance) {
    const client = createLibsqlClient(getEnv().DATABASE_URL);
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    const instance = getDbInstance();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
