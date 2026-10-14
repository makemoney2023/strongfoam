import { assemblyLocationLabel, type InsulationAssembly } from "@/lib/ops/assembly";

export type CloseoutPacketDraft = {
  narrative: string;
  citations: string[];
};

export function draftCloseoutPacket(input: {
  jobName: string;
  assembly: Pick<
    InsulationAssembly,
    | "location"
    | "targetRValue"
    | "existingRValue"
    | "areaSqFt"
    | "bagCount"
    | "product"
    | "manufacturer"
    | "rebateProgram"
    | "airBarrier"
    | "vaporBarrier"
    | "blowerDoor"
  > | null;
  photoCount: number;
  quantityLines: string[];
  planRows: string[];
  photoLog?: string[];
}): { ok: true; draft: CloseoutPacketDraft } | { ok: false; error: string } {
  if (!input.assembly) {
    return {
      ok: false,
      error: "Record the insulation assembly before drafting the closeout packet.",
    };
  }
  const assembly = input.assembly;
  const citations = [
    `assembly:${assembly.location}`,
    `photos:${input.photoCount}`,
    ...input.quantityLines.map((_, index) => `quantity:${index + 1}`),
    ...input.planRows.map((_, index) => `plan:${index + 1}`),
    ...(input.photoLog ?? []).map((_, index) => `photo-log:${index + 1}`),
  ];
  const existing = assembly.existingRValue ? ` Existing R-value ${assembly.existingRValue}.` : "";
  const program = assembly.rebateProgram ? ` Rebate program: ${assembly.rebateProgram}.` : "";
  const barriers = [assembly.airBarrier, assembly.vaporBarrier, assembly.blowerDoor]
    .filter(Boolean)
    .join(" ");
  const quantities = input.quantityLines.length
    ? ` Installed quantities: ${input.quantityLines.join("; ")}.`
    : " No stated installed quantity is on the job.";
  const plans = input.planRows.length
    ? ` Plan marks: ${input.planRows.join("; ")}.`
    : " No plan marks are included.";
  const photoLog = (input.photoLog ?? []).map((line) => line.trim()).filter(Boolean);
  const narrative = [
    `${input.jobName} closeout packet.`,
    `${assemblyLocationLabel(assembly.location)} assembly, target ${assembly.targetRValue}, ${assembly.areaSqFt} sq ft, ${assembly.bagCount} bags of ${assembly.product}${assembly.manufacturer ? ` (${assembly.manufacturer})` : ""}.${existing}${program}`,
    `${input.photoCount} photo${input.photoCount === 1 ? "" : "s"}.${quantities}${plans}`,
    photoLog.length ? `Photo log: ${photoLog.join("; ")}.` : "",
    barriers ? `Conditions: ${barriers}` : "Barrier and blower-door notes are not recorded.",
    "This draft is not sent to the customer.",
  ]
    .filter(Boolean)
    .join(" ");
  return { ok: true, draft: { narrative, citations } };
}
