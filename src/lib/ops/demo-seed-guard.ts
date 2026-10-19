export function bindingLooksRemote(database: unknown): boolean {
  if (!database || typeof database !== "object") return false;
  const record = database as { remote?: unknown; mode?: unknown };
  return record.remote === true || record.mode === "remote";
}

export function demoSeedRefusal(input: {
  env: Record<string, string | undefined>;
  argv?: readonly string[];
  remoteBinding?: boolean;
}): string | null {
  if (input.env.OPS_DEMO !== "1") {
    return "Refusing to seed. OPS_DEMO is unset.";
  }
  if (input.remoteBinding) {
    return "Refusing to seed. The database binding is remote.";
  }
  const argv = input.argv ?? [];
  if (argv.includes("--remote")) {
    return "Refusing to seed. --remote would target production D1.";
  }
  if (
    input.env.WRANGLER_REMOTE === "1" ||
    input.env.CF_D1_REMOTE === "1" ||
    input.env.DEMO_DB_REMOTE === "1"
  ) {
    return "Refusing to seed. A remote D1 flag is set.";
  }
  return null;
}

export function assertDemoSeedAllowed(input: {
  env: Record<string, string | undefined>;
  argv?: readonly string[];
  remoteBinding?: boolean;
}): void {
  const reason = demoSeedRefusal(input);
  if (reason) throw new Error(reason);
}

export function goldenDemoEnabled(
  env: Record<string, string | undefined> = process.env,
  argv: readonly string[] = process.argv,
  database?: unknown,
): boolean {
  if (env.DEMO_GOLDEN !== "1") return false;
  return demoSeedRefusal({ env, argv, remoteBinding: bindingLooksRemote(database) }) === null;
}
