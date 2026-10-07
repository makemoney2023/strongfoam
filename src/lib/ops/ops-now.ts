import { readWorkerDatabase, isDemoOpsStore } from "@/lib/ops/demo-mode";
import { DEMO_SCHEDULE_NOW } from "@/lib/ops/demo-data";

export function getOpsNow(
  env: Record<string, string | undefined> = process.env,
  wallClock: () => Date = () => new Date(),
  database: unknown = readWorkerDatabase(),
): Date {
  const source = isDemoOpsStore(env, database)
    ? new Date(DEMO_SCHEDULE_NOW)
    : wallClock();
  return new Date(source.getTime());
}
