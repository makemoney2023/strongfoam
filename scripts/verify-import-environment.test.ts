import { describe, expect, it } from "vitest";
import { verifyImportEnvironment, type ImportEnvironmentProbe } from "./verify-import-environment";

function ready(overrides: Partial<ImportEnvironmentProbe> = {}): ImportEnvironmentProbe {
  return {
    expectedDatabase: "staging",
    databaseLabel: "staging",
    runtimeMatchesMigration: false,
    bucketPublic: false,
    crossOrganizationListCount: 0,
    exposedSchemas: ["public"],
    rollbackLeftProbe: false,
    workerClaimedJob: true,
    backupConfirmed: false,
    ...overrides,
  };
}

describe("import environment verifier", () => {
  it("passes a private staging environment without printing secrets", () => {
    const result = verifyImportEnvironment(ready());
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/postgres:|eyJ|signed/i);
  });

  it.each([
    ["database-target", { databaseLabel: "local" }],
    ["separate-runtime-and-migration-credentials", { runtimeMatchesMigration: true }],
    ["import-bucket-private", { bucketPublic: true }],
    ["no-cross-organization-list", { crossOrganizationListCount: 2 }],
    ["private-schema-unexposed", { exposedSchemas: ["public", "private"] }],
    ["transaction-rollback", { rollbackLeftProbe: true }],
    ["worker-claim", { workerClaimedJob: false }],
    ["backup-confirmed", { expectedDatabase: "production" as const, databaseLabel: "production", backupConfirmed: false }],
  ])("fails %s", (name, patch) => {
    const result = verifyImportEnvironment(ready(patch));
    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.name === name)?.ok).toBe(false);
  });
});
