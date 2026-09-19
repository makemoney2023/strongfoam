export function isDemoOpsStore(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.OPS_DEMO === "1" || !env.DATABASE_URL;
}
