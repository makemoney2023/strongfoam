import { defineConfig } from "drizzle-kit";
import { parseDatabaseConfig } from "./src/db/config";

const database = parseDatabaseConfig(process.env);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: database.ok ? database.value.directUrl : "" },
});
