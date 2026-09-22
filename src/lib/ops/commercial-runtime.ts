import {
  commercialCapabilityAllowed,
  type CommercialCapability,
} from "@/lib/ops/commercial-flags";
import { readWorkerHeartbeatAt } from "@/lib/ops/store";

export async function guardCommercialCapability(
  capability: CommercialCapability,
  organizationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const heartbeatAt =
    capability === "ai" ? await readWorkerHeartbeatAt(organizationId) : null;
  return commercialCapabilityAllowed(capability, {
    env: process.env,
    organizationId,
    now: new Date(),
    heartbeatAt,
  });
}
