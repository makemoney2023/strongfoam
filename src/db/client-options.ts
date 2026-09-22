import type { Options, Sql } from "postgres";

// Supavisor's transaction pooler finishes a parameterized query and then never
// delivers ReadyForQuery when several of those queries share the handshake.
// A single query returns normally, so the web client runs one at a time.
export const appPostgresOptions = {
  prepare: false,
  fetch_types: false,
  max: 1,
  idle_timeout: 5,
  max_lifetime: 60,
  connect_timeout: 10,
  connection: {
    statement_timeout: 15_000,
    idle_in_transaction_session_timeout: 8_000,
  },
} satisfies Options<Record<string, never>>;

type UnsafeQuery = {
  values: () => UnsafeQuery;
  raw: () => UnsafeQuery;
  then: Promise<unknown>["then"];
};

export function serializePostgresQueries(sql: Sql): Sql {
  let tail: Promise<void> = Promise.resolve();
  const original = sql.unsafe.bind(sql);

  sql.unsafe = ((query: string, params?: unknown[], options?: Record<string, unknown>) => {
    let mode: "rows" | "values" | "raw" = "rows";
    let started = false;
    let pending: Promise<unknown> | null = null;
    const api = {
      values() {
        mode = "values";
        return api;
      },
      raw() {
        mode = "raw";
        return api;
      },
      execute() {
        return api;
      },
      then(
        resolve?: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        if (!started) {
          started = true;
          pending = tail.then(() => {
            const statement = original(query, params as never[], options as never) as unknown as UnsafeQuery;
            if (mode === "values") statement.values();
            if (mode === "raw") statement.raw();
            return statement;
          });
          tail = pending.then(
            () => undefined,
            () => undefined,
          );
        }
        return pending!.then(resolve, reject);
      },
      catch(reject?: (reason: unknown) => unknown) {
        return api.then(undefined, reject);
      },
      finally(onFinally?: () => void) {
        return api.then(
          (value) => Promise.resolve(onFinally?.()).then(() => value),
          (error: unknown) =>
            Promise.resolve(onFinally?.()).then(() => {
              throw error;
            }),
        );
      },
    };
    return api;
  }) as unknown as Sql["unsafe"];

  return sql;
}
