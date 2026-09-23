import { demoDispatchSeed, seedWhenDemo } from "@/lib/ops/demo-operations";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import type { Dispatch } from "@/lib/ops/dispatch";

type DispatchMemory = {
  rows: Dispatch[];
};

export function dispatchMemory(): DispatchMemory {
  const globalForDispatch = globalThis as typeof globalThis & {
    __strongfoamDispatches?: DispatchMemory;
  };
  globalForDispatch.__strongfoamDispatches ??= {
    rows: seedWhenDemo(() => demoDispatchSeed(), []),
  };
  return globalForDispatch.__strongfoamDispatches;
}

export function resetDispatchMemory(): void {
  const globalForDispatch = globalThis as typeof globalThis & {
    __strongfoamDispatches?: DispatchMemory;
  };
  globalForDispatch.__strongfoamDispatches = { rows: [] };
}

export function scheduledDispatchGrantsJobAccess(
  userId: string,
  jobId: string,
  workDate: string,
): boolean {
  return dispatchMemory().rows.some(
    (row) =>
      row.organizationId === STRONG_FOAM_ORGANIZATION_ID &&
      row.userId === userId &&
      row.jobId === jobId &&
      row.workDate === workDate &&
      row.status === "scheduled",
  );
}
