import type { Options } from "postgres";

// The staff home page issues several queries at once. postgres.js with max: 1
// shares one Supavisor connection for that burst, and the describe/bind
// handshake then waits forever on ClientRead. Transactions still reserve one
// connection via begin(), so a small pool is safe.
export const appPostgresOptions = {
  prepare: false,
  fetch_types: false,
  max: 8,
  idle_timeout: 5,
  max_lifetime: 60,
  connect_timeout: 10,
  connection: {
    statement_timeout: 15_000,
    idle_in_transaction_session_timeout: 8_000,
  },
} satisfies Options<Record<string, never>>;
