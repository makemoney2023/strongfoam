import { demoCloseoutSeed, seedWhenDemo } from "@/lib/ops/demo-operations";
import type { Closeout } from "@/lib/ops/closeout";

type CloseoutMemory = {
  rows: Closeout[];
};

export function closeoutMemory(): CloseoutMemory {
  const globalForCloseout = globalThis as typeof globalThis & {
    __strongfoamCloseouts?: CloseoutMemory;
  };
  globalForCloseout.__strongfoamCloseouts ??= {
    rows: seedWhenDemo(() => demoCloseoutSeed(), []),
  };
  return globalForCloseout.__strongfoamCloseouts;
}

export function resetCloseoutMemory(): void {
  const globalForCloseout = globalThis as typeof globalThis & {
    __strongfoamCloseouts?: CloseoutMemory;
  };
  globalForCloseout.__strongfoamCloseouts = { rows: [] };
}
