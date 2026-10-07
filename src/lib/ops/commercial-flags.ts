export const COMMERCIAL_CAPABILITIES = [
  "estimates",
  "extraction",
  "ai",
  "proposals",
  "conversion",
] as const;

export type CommercialCapability = (typeof COMMERCIAL_CAPABILITIES)[number];

export const COMMERCIAL_FLAG_ENV = {
  estimates: "COMMERCIAL_ESTIMATES_ENABLED",
  extraction: "BID_DOCUMENT_EXTRACTION_ENABLED",
  ai: "COMMERCIAL_AI_ENABLED",
  proposals: "SIGNED_PROPOSALS_ENABLED",
  conversion: "ACCEPTED_ESTIMATE_CONVERSION_ENABLED",
} as const satisfies Record<CommercialCapability, string>;

export const COMMERCIAL_EVALUATION_CASES = [
  "geometry",
  "price",
  "prompt-injection",
  "citation",
  "cross-organization",
] as const;

export const COMMERCIAL_WORKFLOW_TESTS = [
  "estimates",
  "approvals",
  "proposals",
  "conversion",
] as const;

export const WORKER_HEARTBEAT_MAX_AGE_MS = 60_000;

const FLAG_ON = new Set(["1", "true", "yes", "on"]);
const FLAG_OFF = new Set(["0", "false", "no", "off"]);

export type CommercialEnv = Record<string, string | undefined>;

export type CommercialControlInput = {
  env: CommercialEnv;
  organizationId: string;
  now: Date;
  heartbeatAt?: Date | null;
};

export type CommercialCapabilityState = {
  enabled: boolean;
  legacyUnset: boolean;
  reasons: string[];
};

export type CommercialControls = Record<CommercialCapability, CommercialCapabilityState>;

type FlagPosition = "on" | "off" | "unset";

function flagPosition(value: string | undefined): FlagPosition {
  if (value === undefined || value.trim() === "") return "unset";
  const normalized = value.trim().toLowerCase();
  if (FLAG_ON.has(normalized)) return "on";
  if (FLAG_OFF.has(normalized)) return "off";
  return "off";
}

function productionLock(env: CommercialEnv): boolean {
  const demo = env.OPS_DEMO?.trim().toLowerCase();
  return env.NODE_ENV === "production" && demo !== "1" && demo !== "true";
}

function tokens(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function positiveInteger(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return /^[1-9]\d*$/.test(trimmed);
}

function organizationAllowed(env: CommercialEnv, organizationId: string): boolean {
  const raw = env.COMMERCIAL_ORGANIZATION_IDS?.trim();
  if (!raw) return true;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(organizationId);
}

function overridePosition(
  env: CommercialEnv,
  organizationId: string,
  flagName: string,
): { position: FlagPosition; invalid: boolean } {
  const raw = env.COMMERCIAL_FLAG_OVERRIDES?.trim();
  if (!raw) return { position: "unset", invalid: false };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { position: "off", invalid: true };
    }
    const org = (parsed as Record<string, unknown>)[organizationId];
    if (org === undefined) return { position: "unset", invalid: false };
    if (!org || typeof org !== "object" || Array.isArray(org)) {
      return { position: "off", invalid: true };
    }
    const value = (org as Record<string, unknown>)[flagName];
    if (value === undefined) return { position: "unset", invalid: false };
    if (typeof value !== "string" && typeof value !== "boolean" && typeof value !== "number") {
      return { position: "off", invalid: true };
    }
    return { position: flagPosition(String(value)), invalid: false };
  } catch {
    return { position: "off", invalid: true };
  }
}

function resolvedFlag(
  env: CommercialEnv,
  organizationId: string,
  flagName: string,
): { position: FlagPosition; invalidOverride: boolean } {
  const override = overridePosition(env, organizationId, flagName);
  if (override.invalid) return { position: "off", invalidOverride: true };
  if (override.position !== "unset") return { position: override.position, invalidOverride: false };
  return { position: flagPosition(env[flagName]), invalidOverride: false };
}

export function isWorkerHeartbeatHealthy(
  heartbeatAt: Date | null | undefined,
  now: Date,
  maxAgeMs = WORKER_HEARTBEAT_MAX_AGE_MS,
): boolean {
  if (!(heartbeatAt instanceof Date) || Number.isNaN(heartbeatAt.getTime())) return false;
  if (Number.isNaN(now.getTime())) return false;
  const age = now.getTime() - heartbeatAt.getTime();
  return age >= -5_000 && age <= maxAgeMs;
}

function scannerConfigured(env: CommercialEnv): boolean {
  const host = env.CLAMAV_HOST?.trim();
  const port = Number(env.CLAMAV_PORT);
  return Boolean(host) && Number.isInteger(port) && port > 0 && port <= 65535;
}

function modelConfigured(env: CommercialEnv): boolean {
  const model = env.AI_COMMERCIAL_MODEL?.trim() || env.AI_GATEWAY_MODEL?.trim();
  if (!model) return false;
  if (model.startsWith("@cf/") || model.startsWith("workers-ai/")) return true;
  return Boolean(env.AI_GATEWAY_API_KEY?.trim());
}

export function commercialAiGateReasons(input: CommercialControlInput): string[] {
  const reasons: string[] = [];
  const workflow = tokens(input.env.COMMERCIAL_WORKFLOW_TESTS_PASSED);
  if (COMMERCIAL_WORKFLOW_TESTS.some((item) => !workflow.has(item))) {
    reasons.push("workflow-tests");
  }
  if (!isWorkerHeartbeatHealthy(input.heartbeatAt, input.now)) {
    reasons.push("worker-heartbeat");
  }
  if (!scannerConfigured(input.env)) reasons.push("scanner");
  if (!input.env.AI_DOCUMENT_MODEL?.trim()) reasons.push("extraction-provider");
  if (!modelConfigured(input.env)) reasons.push("model-provider");
  if (flagPosition(input.env.COMMERCIAL_DATA_RESIDENCY_APPROVED) !== "on") {
    reasons.push("data-residency");
  }
  const evaluation = tokens(input.env.COMMERCIAL_AI_EVALUATION_PASSED);
  for (const item of COMMERCIAL_EVALUATION_CASES) {
    if (!evaluation.has(item)) reasons.push(`evaluation-${item}`);
  }
  if (!positiveInteger(input.env.COMMERCIAL_AI_MONTHLY_COST_LIMIT_CENTS)) {
    reasons.push("cost-limit");
  }
  if (!positiveInteger(input.env.COMMERCIAL_AI_RATE_LIMIT_PER_HOUR)) {
    reasons.push("rate-limit");
  }
  return reasons;
}

function capabilityState(
  capability: CommercialCapability,
  input: CommercialControlInput,
  allowedOrg: boolean,
): CommercialCapabilityState {
  if (!allowedOrg) {
    return { enabled: false, legacyUnset: false, reasons: ["organization"] };
  }
  const flag = resolvedFlag(input.env, input.organizationId, COMMERCIAL_FLAG_ENV[capability]);
  if (flag.invalidOverride) {
    return { enabled: false, legacyUnset: false, reasons: ["flag-overrides"] };
  }
  const locked = productionLock(input.env);
  if (capability === "ai") {
    if (flag.position === "unset" && !locked) {
      return { enabled: false, legacyUnset: true, reasons: [] };
    }
    if (flag.position !== "on") {
      return { enabled: false, legacyUnset: false, reasons: ["disabled"] };
    }
    const reasons = commercialAiGateReasons(input);
    return { enabled: reasons.length === 0, legacyUnset: false, reasons };
  }
  if (flag.position === "on") return { enabled: true, legacyUnset: false, reasons: [] };
  if (flag.position === "unset" && !locked) {
    return { enabled: false, legacyUnset: true, reasons: [] };
  }
  return { enabled: false, legacyUnset: false, reasons: ["disabled"] };
}

export function readCommercialControls(input: CommercialControlInput): CommercialControls {
  const allowedOrg = organizationAllowed(input.env, input.organizationId);
  return {
    estimates: capabilityState("estimates", input, allowedOrg),
    extraction: capabilityState("extraction", input, allowedOrg),
    ai: capabilityState("ai", input, allowedOrg),
    proposals: capabilityState("proposals", input, allowedOrg),
    conversion: capabilityState("conversion", input, allowedOrg),
  };
}

export function commercialCapabilityAllowed(
  capability: CommercialCapability,
  input: CommercialControlInput,
): { ok: true } | { ok: false; error: string } {
  const state = readCommercialControls(input)[capability];
  if (state.enabled || state.legacyUnset) return { ok: true };
  const detail = state.reasons.length > 0 ? ` (${state.reasons.join(", ")})` : "";
  return { ok: false, error: `Commercial ${capability} is disabled${detail}.` };
}
