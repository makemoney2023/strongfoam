export type AiUsageEvent = {
  organizationId: string;
  purpose: string;
  model: string;
  status: "ok" | "error";
  cache: "key" | "skip" | "none";
  latencyMs: number;
  attempts: number;
  inputChars: number;
  outputChars: number;
};

export type AiUsageDataPoint = {
  indexes: string[];
  blobs: string[];
  doubles: number[];
};

export type AiUsageDataset = {
  writeDataPoint(point: AiUsageDataPoint): void;
};

export function usageDataPoint(event: AiUsageEvent): AiUsageDataPoint {
  const clip = (value: string) => value.slice(0, 1024);
  return {
    indexes: [clip(event.organizationId || "unknown")],
    blobs: [
      clip(event.purpose),
      clip(event.model),
      event.status,
      event.cache,
      clip(event.organizationId || "unknown"),
    ],
    doubles: [event.latencyMs, event.attempts, event.inputChars, event.outputChars],
  };
}

export function recordAiUsage(dataset: AiUsageDataset | undefined, event: AiUsageEvent): void {
  if (!dataset) return;
  try {
    dataset.writeDataPoint(usageDataPoint(event));
  } catch (error) {
    console.error("AI usage write failed.", error);
  }
}
