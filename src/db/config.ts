export type DatabaseConfig = {
  appUrl: string;
  workerUrl: string;
  directUrl: string;
};

const POSTGRES_URL = /^postgres(?:ql)?:\/\//i;

type DatabaseEnv = {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  WORKER_DATABASE_URL?: string;
  DIRECT_URL?: string;
};

function readUrl(
  env: DatabaseEnv,
  name: "DATABASE_URL" | "WORKER_DATABASE_URL" | "DIRECT_URL",
): string | null {
  const value = env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function parseDatabaseConfig(
  env: DatabaseEnv,
): { ok: true; value: DatabaseConfig } | { ok: false; error: string } {
  const appUrl = readUrl(env, "DATABASE_URL");
  if (!appUrl) return { ok: false, error: "DATABASE_URL is not set" };
  if (!POSTGRES_URL.test(appUrl)) {
    return { ok: false, error: "DATABASE_URL is not a PostgreSQL connection string" };
  }
  const workerUrl = readUrl(env, "WORKER_DATABASE_URL");
  const directUrl = readUrl(env, "DIRECT_URL");
  const production = env.NODE_ENV === "production";
  if (production && !workerUrl) return { ok: false, error: "WORKER_DATABASE_URL is not set" };
  if (production && !directUrl) return { ok: false, error: "DIRECT_URL is not set" };
  const resolvedWorker = workerUrl ?? appUrl;
  const resolvedDirect = directUrl ?? appUrl;
  if (!POSTGRES_URL.test(resolvedWorker)) {
    return { ok: false, error: "WORKER_DATABASE_URL is not a PostgreSQL connection string" };
  }
  if (!POSTGRES_URL.test(resolvedDirect)) {
    return { ok: false, error: "DIRECT_URL is not a PostgreSQL connection string" };
  }
  return {
    ok: true,
    value: {
      appUrl,
      workerUrl: resolvedWorker,
      directUrl: resolvedDirect,
    },
  };
}
