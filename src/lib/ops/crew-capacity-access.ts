type CapacityMemory = { rows: { id: string; organizationId: string; userId: string; jobsPerDay: number }[] };

export function capacityMemory(): CapacityMemory {
  const globalForCapacity = globalThis as typeof globalThis & {
    __strongfoamCrewCapacity?: CapacityMemory;
  };
  globalForCapacity.__strongfoamCrewCapacity ??= { rows: [] };
  return globalForCapacity.__strongfoamCrewCapacity;
}

export function resetCapacityMemory(): void {
  const globalForCapacity = globalThis as typeof globalThis & {
    __strongfoamCrewCapacity?: CapacityMemory;
  };
  globalForCapacity.__strongfoamCrewCapacity = { rows: [] };
}
