import { describe, expect, it } from "vitest";
import { appPostgresOptions } from "@/db/client-options";

describe("appPostgresOptions", () => {
  it("lets concurrent staff queries use more than one pooled connection", () => {
    expect(appPostgresOptions.prepare).toBe(false);
    expect(appPostgresOptions.fetch_types).toBe(false);
    expect(appPostgresOptions.max).toBeGreaterThan(1);
    expect(appPostgresOptions.connection.statement_timeout).toBe(15_000);
    expect(appPostgresOptions.connection.idle_in_transaction_session_timeout).toBe(
      8_000,
    );
  });
});
