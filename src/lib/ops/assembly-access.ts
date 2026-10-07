import type { InsulationAssembly } from "@/lib/ops/assembly";

type AssemblyMemory = { rows: InsulationAssembly[] };

export function assemblyMemory(): AssemblyMemory {
  const globalForAssembly = globalThis as typeof globalThis & {
    __strongfoamAssemblies?: AssemblyMemory;
  };
  globalForAssembly.__strongfoamAssemblies ??= { rows: [] };
  return globalForAssembly.__strongfoamAssemblies;
}

export function resetAssemblyMemory(): void {
  const globalForAssembly = globalThis as typeof globalThis & {
    __strongfoamAssemblies?: AssemblyMemory;
  };
  globalForAssembly.__strongfoamAssemblies = { rows: [] };
}
