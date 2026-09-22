import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { appPostgresOptions, serializePostgresQueries } from "@/db/client-options";
import * as schema from "@/db/schema";
import { parseAppDatabaseConfig } from "@/db/config";

function createDb() {
  const config = parseAppDatabaseConfig(process.env);
  if (!config.ok) throw new Error(config.error);
  const client = serializePostgresQueries(postgres(config.value.appUrl, appPostgresOptions));
  return drizzle(client, { schema });
}

let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!db) db = createDb();
  return db;
}
