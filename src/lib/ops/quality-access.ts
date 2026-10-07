import { demoQualitySeed, seedWhenDemo } from "@/lib/ops/demo-operations";
import type { QualityRecord } from "@/lib/ops/quality";

type QualityMemory = {
  rows: QualityRecord[];
};

export function qualityMemory(): QualityMemory {
  const globalForQuality = globalThis as typeof globalThis & {
    __strongfoamQuality?: QualityMemory;
  };
  globalForQuality.__strongfoamQuality ??= {
    rows: seedWhenDemo(() => demoQualitySeed(), []),
  };
  return globalForQuality.__strongfoamQuality;
}

export function resetQualityMemory(): void {
  const globalForQuality = globalThis as typeof globalThis & {
    __strongfoamQuality?: QualityMemory;
  };
  globalForQuality.__strongfoamQuality = { rows: [] };
}
