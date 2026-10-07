import { getCloudflareContext } from "@opennextjs/cloudflare";

export function readWorkerDatabase(): unknown {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return null;
  try {
    const { env } = getCloudflareContext();
    const database = (env as { DB?: unknown }).DB;
    return database ?? null;
  } catch (error) {
    const onWorker =
      typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
    if (!onWorker) return null;
    throw error instanceof Error ? error : new Error("Cloudflare D1 is unavailable.");
  }
}

export function isDemoOpsStore(
  env: Record<string, string | undefined> = process.env,
  database: unknown = readWorkerDatabase(),
): boolean {
  if (env.OPS_DEMO === "1") return true;
  return database == null;
}
