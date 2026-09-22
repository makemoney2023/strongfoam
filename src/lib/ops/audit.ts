import { getDb } from "@/db";
import { auditEvents, type AuditEventRow } from "@/db/schema";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { appendDemoAuditEvent } from "@/lib/ops/demo-store";

export type { AuditEventRow };

export type AuditEventResult = "success" | "denied" | "failure";

export type AuditEventInput = {
  organizationId: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  result: AuditEventResult;
  correlationId: string;
  payload?: Record<string, unknown>;
};

const REDACTED = "[redacted]";

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[_-]/g, "").toLowerCase();
  if (
    normalized === "text" ||
    normalized === "bytes" ||
    normalized === "password" ||
    normalized === "secret" ||
    normalized === "authorization" ||
    normalized === "rawtext" ||
    normalized === "documenttext" ||
    normalized === "pagetext" ||
    normalized === "extractedtext"
  ) {
    return true;
  }
  if (normalized.includes("password")) return true;
  if (normalized.includes("token")) return true;
  if (normalized.includes("secret")) return true;
  if (normalized === "apikey" || normalized.endsWith("apikey")) return true;
  if (normalized === "providerkey" || normalized.endsWith("providerkey")) {
    return true;
  }
  if (normalized === "filebytes" || normalized.endsWith("filebytes")) {
    return true;
  }
  if (normalized.includes("signedurl")) return true;
  if (normalized === "values" || normalized === "rowvalues") return true;
  return false;
}

function looksLikeSignedStorageUrl(value: string): boolean {
  return /\/storage\/v1\/object\/sign\//i.test(value) || /[?&]token=/i.test(value);
}

function redactValue(value: unknown): unknown {
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return REDACTED;
  if (value instanceof Uint8Array) return REDACTED;
  if (typeof value === "string" && looksLikeSignedStorageUrl(value)) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === "object") {
    return redactAuditPayload(value as Record<string, unknown>);
  }
  return value;
}

export function redactAuditPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    redacted[key] = isSensitiveKey(key) ? REDACTED : redactValue(value);
  }
  return redacted;
}

export async function recordAuditEvent(
  input: AuditEventInput,
): Promise<AuditEventRow> {
  const row: AuditEventRow = {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    createdAt: new Date(),
    actor: input.actor,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    result: input.result,
    correlationId: input.correlationId,
    payload: redactAuditPayload(input.payload ?? {}),
  };
  if (isDemoOpsStore()) return appendDemoAuditEvent(row);
  const inserted = await getDb().insert(auditEvents).values(row).returning();
  const saved = inserted[0];
  if (!saved) throw new Error("The audit event could not be saved.");
  return saved;
}
