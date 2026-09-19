import { DEMO_SCHEDULE_NOW } from "@/lib/ops/demo-data";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";

export function getOpsNow(
  env: Record<string, string | undefined> = process.env,
  wallClock: () => Date = () => new Date(),
): Date {
  const source = isDemoOpsStore(env)
    ? new Date(DEMO_SCHEDULE_NOW)
    : wallClock();
  return new Date(source.getTime());
}
