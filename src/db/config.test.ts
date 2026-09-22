import { describe, expect, it } from "vitest";
import { parseAppDatabaseConfig, parseDatabaseConfig } from "@/db/config";

const SECRET = "postgres://app-user:super-secret-password@db.internal:6543/strongfoam";

describe("parseDatabaseConfig", () => {
  it("requires DATABASE_URL", () => {
    expect(parseDatabaseConfig({})).toEqual({
      ok: false,
      error: "DATABASE_URL is not set",
    });
  });

  it("keeps distinct application, worker, and migration URLs", () => {
    expect(
      parseDatabaseConfig({
        DATABASE_URL: "postgres://app",
        WORKER_DATABASE_URL: "postgres://worker",
        DIRECT_URL: "postgres://direct",
      }),
    ).toEqual({
      ok: true,
      value: {
        appUrl: "postgres://app",
        workerUrl: "postgres://worker",
        directUrl: "postgres://direct",
      },
    });
  });

  it("falls back to DATABASE_URL outside production", () => {
    expect(
      parseDatabaseConfig({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://app",
      }),
    ).toEqual({
      ok: true,
      value: {
        appUrl: "postgres://app",
        workerUrl: "postgres://app",
        directUrl: "postgres://app",
      },
    });
  });

  it("lets the application connect with only DATABASE_URL", () => {
    expect(
      parseAppDatabaseConfig({
        NODE_ENV: "production",
        DATABASE_URL: SECRET,
      }),
    ).toEqual({ ok: true, value: { appUrl: SECRET } });

    const missing = parseAppDatabaseConfig({ NODE_ENV: "production" });
    expect(missing).toEqual({ ok: false, error: "DATABASE_URL is not set" });

    const invalid = parseAppDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: "https://db.internal/strongfoam",
    });
    expect(invalid).toEqual({
      ok: false,
      error: "DATABASE_URL is not a PostgreSQL connection string",
    });
    if (!invalid.ok) expect(invalid.error).not.toContain("db.internal");
  });

  it("fails closed in production without echoing secrets", () => {
    const result = parseDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: SECRET,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("WORKER_DATABASE_URL is not set");
    expect(result.error).not.toContain("super-secret-password");
    expect(result.error).not.toContain(SECRET);

    const direct = parseDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: SECRET,
      WORKER_DATABASE_URL: "postgres://worker",
    });
    expect(direct).toEqual({ ok: false, error: "DIRECT_URL is not set" });
    if (!direct.ok) expect(direct.error).not.toContain(SECRET);
  });
});
