import { describe, expect, it } from "vitest";
import { appPostgresOptions, serializePostgresQueries } from "@/db/client-options";
import type { Sql } from "postgres";

describe("appPostgresOptions", () => {
  it("uses one pooled connection and cancels a stuck statement", () => {
    expect(appPostgresOptions.prepare).toBe(false);
    expect(appPostgresOptions.fetch_types).toBe(false);
    expect(appPostgresOptions.max).toBe(1);
    expect(appPostgresOptions.connection.statement_timeout).toBe(15_000);
    expect(appPostgresOptions.connection.idle_in_transaction_session_timeout).toBe(
      8_000,
    );
  });
});

describe("serializePostgresQueries", () => {
  it("does not start a second query until the first one finishes", async () => {
    const started: string[] = [];
    let releaseFirst: () => void = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const sql = {
      unsafe(query: string) {
        started.push(query);
        let mode: "rows" | "values" = "rows";
        const statement = {
          values() {
            mode = "values";
            return statement;
          },
          raw() {
            return statement;
          },
          then(resolve: (value: unknown) => void) {
            const finish = () => resolve(mode === "values" ? [query] : query);
            if (query === "first") firstGate.then(finish);
            else finish();
          },
        };
        return statement;
      },
    };
    const serialized = serializePostgresQueries(sql as unknown as Sql);
    const first = serialized.unsafe("first").values();
    const second = serialized.unsafe("second").values();

    expect(started).toEqual([]);
    const finished = Promise.all([first, second]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual(["first"]);
    releaseFirst();
    await expect(finished).resolves.toEqual([["first"], ["second"]]);
    expect(started).toEqual(["first", "second"]);
  });
});
