import { demoEquipmentSeed, seedWhenDemo } from "@/lib/ops/demo-operations";
import type { EquipmentAssignment } from "@/lib/ops/equipment";

type EquipmentMemory = {
  assignments: EquipmentAssignment[];
};

export function equipmentMemory(): EquipmentMemory {
  const globalForEquipment = globalThis as typeof globalThis & {
    __strongfoamEquipment?: EquipmentMemory;
  };
  globalForEquipment.__strongfoamEquipment ??= {
    assignments: seedWhenDemo(() => demoEquipmentSeed(), []),
  };
  return globalForEquipment.__strongfoamEquipment;
}

export function resetEquipmentMemory(): void {
  const globalForEquipment = globalThis as typeof globalThis & {
    __strongfoamEquipment?: EquipmentMemory;
  };
  globalForEquipment.__strongfoamEquipment = { assignments: [] };
}
