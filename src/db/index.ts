import { drizzle, type AnyD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { readWorkerDatabase } from "@/lib/ops/demo-mode";

type OpsDatabase = ReturnType<typeof drizzle<typeof schema>>;

let db: OpsDatabase | null = null;

export function getDb(): OpsDatabase {
  if (!db) {
    const d1 = readWorkerDatabase();
    if (!d1) throw new Error("Cloudflare D1 binding DB is not available.");
    db = drizzle(d1 as AnyD1Database, { schema });
  }
  return db;
}
