export const ASSEMBLY_LOCATIONS = [
  "attic",
  "wall",
  "rim_joist",
  "basement",
  "crawlspace",
  "roof",
] as const;

export type AssemblyLocation = (typeof ASSEMBLY_LOCATIONS)[number];

export type InsulationAssembly = {
  id: string;
  organizationId: string;
  jobId: string;
  location: AssemblyLocation;
  existingRValue: string;
  targetRValue: string;
  areaSqFt: number;
  depthInches: string;
  product: string;
  manufacturer: string;
  batch: string;
  lot: string;
  bagCount: number;
  airBarrier: string;
  vaporBarrier: string;
  blowerDoor: string;
  rebateProgram: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const LOCATION_LABELS: Record<AssemblyLocation, string> = {
  attic: "Attic",
  wall: "Wall",
  rim_joist: "Rim joist",
  basement: "Basement",
  crawlspace: "Crawlspace",
  roof: "Roof",
};

export function assemblyLocationLabel(location: AssemblyLocation): string {
  return LOCATION_LABELS[location];
}

function clean(value: string | undefined, limit: number): { ok: true; value: string } | { ok: false; error: string } {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (text.length > limit) return { ok: false, error: `Keep that field under ${limit} characters.` };
  return { ok: true, value: text };
}

function whole(value: string | undefined, label: string): { ok: true; value: number } | { ok: false; error: string } {
  const text = (value ?? "").trim();
  if (!/^[1-9]\d{0,6}$/.test(text)) {
    return { ok: false, error: `Enter a whole ${label} from 1 to 1000000.` };
  }
  return { ok: true, value: Number(text) };
}

export function parseAssembly(input: {
  location?: string;
  existingRValue?: string;
  targetRValue?: string;
  areaSqFt?: string;
  depthInches?: string;
  product?: string;
  manufacturer?: string;
  batch?: string;
  lot?: string;
  bagCount?: string;
  airBarrier?: string;
  vaporBarrier?: string;
  blowerDoor?: string;
  rebateProgram?: string;
}):
  | {
      ok: true;
      value: Omit<
        InsulationAssembly,
        "id" | "organizationId" | "jobId" | "createdBy" | "createdAt" | "updatedAt"
      >;
    }
  | { ok: false; error: string } {
  if (!ASSEMBLY_LOCATIONS.includes(input.location as AssemblyLocation)) {
    return { ok: false, error: "Choose an assembly location." };
  }
  const targetRValue = clean(input.targetRValue, 20);
  if (!targetRValue.ok) return targetRValue;
  if (!targetRValue.value) return { ok: false, error: "Enter the target R-value." };
  const existingRValue = clean(input.existingRValue, 20);
  if (!existingRValue.ok) return existingRValue;
  const areaSqFt = whole(input.areaSqFt, "area");
  if (!areaSqFt.ok) return areaSqFt;
  const bagCount = whole(input.bagCount, "bag count");
  if (!bagCount.ok) return bagCount;
  const product = clean(input.product, 80);
  if (!product.ok) return product;
  if (!product.value) return { ok: false, error: "Enter the product." };
  const depthInches = clean(input.depthInches, 20);
  if (!depthInches.ok) return depthInches;
  const manufacturer = clean(input.manufacturer, 80);
  if (!manufacturer.ok) return manufacturer;
  const batch = clean(input.batch, 40);
  if (!batch.ok) return batch;
  const lot = clean(input.lot, 40);
  if (!lot.ok) return lot;
  const airBarrier = clean(input.airBarrier, 500);
  if (!airBarrier.ok) return airBarrier;
  const vaporBarrier = clean(input.vaporBarrier, 500);
  if (!vaporBarrier.ok) return vaporBarrier;
  const blowerDoor = clean(input.blowerDoor, 200);
  if (!blowerDoor.ok) return blowerDoor;
  const rebateProgram = clean(input.rebateProgram, 80);
  if (!rebateProgram.ok) return rebateProgram;
  return {
    ok: true,
    value: {
      location: input.location as AssemblyLocation,
      existingRValue: existingRValue.value,
      targetRValue: targetRValue.value,
      areaSqFt: areaSqFt.value,
      depthInches: depthInches.value,
      product: product.value,
      manufacturer: manufacturer.value,
      batch: batch.value,
      lot: lot.value,
      bagCount: bagCount.value,
      airBarrier: airBarrier.value,
      vaporBarrier: vaporBarrier.value,
      blowerDoor: blowerDoor.value,
      rebateProgram: rebateProgram.value,
    },
  };
}
