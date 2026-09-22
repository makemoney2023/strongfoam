export type ImportEnvironmentProbe = {
  expectedDatabase: "staging" | "production";
  databaseLabel: string;
  runtimeMatchesMigration: boolean;
  bucketPublic: boolean;
  crossOrganizationListCount: number;
  exposedSchemas: readonly string[];
  rollbackLeftProbe: boolean;
  workerClaimedJob: boolean;
  backupConfirmed: boolean;
};

export type ImportEnvironmentCheck = {
  name: string;
  ok: boolean;
};

export function verifyImportEnvironment(probe: ImportEnvironmentProbe): {
  ok: boolean;
  checks: ImportEnvironmentCheck[];
} {
  const expected =
    probe.expectedDatabase === "production" ? "production" : "staging";
  const checks: ImportEnvironmentCheck[] = [
    {
      name: "database-target",
      ok: probe.databaseLabel === expected,
    },
    {
      name: "separate-runtime-and-migration-credentials",
      ok: !probe.runtimeMatchesMigration,
    },
    {
      name: "import-bucket-private",
      ok: !probe.bucketPublic,
    },
    {
      name: "no-cross-organization-list",
      ok: probe.crossOrganizationListCount === 0,
    },
    {
      name: "private-schema-unexposed",
      ok: !probe.exposedSchemas.some((schema) => schema === "private"),
    },
    {
      name: "transaction-rollback",
      ok: !probe.rollbackLeftProbe,
    },
    {
      name: "worker-claim",
      ok: probe.workerClaimedJob,
    },
    {
      name: "backup-confirmed",
      ok: probe.expectedDatabase === "staging" || probe.backupConfirmed,
    },
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

function probeFromEnv(env: NodeJS.ProcessEnv): ImportEnvironmentProbe {
  const expected = env.IMPORT_VERIFY_TARGET === "production" ? "production" : "staging";
  return {
    expectedDatabase: expected,
    databaseLabel: env.IMPORT_DATABASE_LABEL?.trim() || "",
    runtimeMatchesMigration: env.IMPORT_RUNTIME_MATCHES_MIGRATION === "1",
    bucketPublic: env.IMPORT_BUCKET_PUBLIC === "1",
    crossOrganizationListCount: Number(env.IMPORT_CROSS_ORG_LIST_COUNT ?? "0"),
    exposedSchemas: (env.IMPORT_EXPOSED_SCHEMAS ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    rollbackLeftProbe: env.IMPORT_ROLLBACK_LEFT_PROBE === "1",
    workerClaimedJob: env.IMPORT_WORKER_CLAIMED === "1",
    backupConfirmed: env.IMPORT_BACKUP_CONFIRMED === "1",
  };
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("verify-import-environment.ts")) {
  const result = verifyImportEnvironment(probeFromEnv(process.env));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
