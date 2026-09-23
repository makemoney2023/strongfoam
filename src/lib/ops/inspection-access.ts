import { demoInspectionSeed, seedWhenDemo } from "@/lib/ops/demo-operations";
import type { Inspection } from "@/lib/ops/inspection";

type InspectionMemory = {
  rows: Inspection[];
};

export function inspectionMemory(): InspectionMemory {
  const globalForInspection = globalThis as typeof globalThis & {
    __strongfoamInspections?: InspectionMemory;
  };
  globalForInspection.__strongfoamInspections ??= {
    rows: seedWhenDemo(() => demoInspectionSeed(), []),
  };
  return globalForInspection.__strongfoamInspections;
}

export function resetInspectionMemory(): void {
  const globalForInspection = globalThis as typeof globalThis & {
    __strongfoamInspections?: InspectionMemory;
  };
  globalForInspection.__strongfoamInspections = { rows: [] };
}
