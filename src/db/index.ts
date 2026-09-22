import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { parseDatabaseConfig } from "@/db/config";

function createDb() {
  const config = parseDatabaseConfig(process.env);
  if (!config.ok) throw new Error(config.error);
  // Supabase's transaction pooler rejects named prepared statements.
  const client = postgres(config.value.appUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!db) db = createDb();
  return db;
}
