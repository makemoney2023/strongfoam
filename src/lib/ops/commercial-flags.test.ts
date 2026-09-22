import { describe, expect, it } from "vitest";
import {
  commercialCapabilityAllowed,
  isWorkerHeartbeatHealthy,
  readCommercialControls,
} from "@/lib/ops/commercial-flags";

const ORG = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-22T15:00:00.000Z");

function readyEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    COMMERCIAL_ESTIMATES_ENABLED: "1",
    BID_DOCUMENT_EXTRACTION_ENABLED: "1",
    COMMERCIAL_AI_ENABLED: "1",
    SIGNED_PROPOSALS_ENABLED: "1",
    ACCEPTED_ESTIMATE_CONVERSION_ENABLED: "1",
    COMMERCIAL_WORKFLOW_TESTS_PASSED: "estimates,approvals,proposals,conversion",
    COMMERCIAL_AI_EVALUATION_PASSED:
      "geometry,price,prompt-injection,citation,cross-organization",
    COMMERCIAL_DATA_RESIDENCY_APPROVED: "1",
    COMMERCIAL_AI_MONTHLY_COST_LIMIT_CENTS: "5000",
    COMMERCIAL_AI_RATE_LIMIT_PER_HOUR: "30",
    CLAMAV_HOST: "clamav.internal",
    CLAMAV_PORT: "3310",
    AI_DOCUMENT_MODEL: "document-ocr",
    AI_GATEWAY_API_KEY: "gateway",
    AI_COMMERCIAL_MODEL: "commercial",
  };
}

function input(env: NodeJS.ProcessEnv, heartbeatAt: Date | null = NOW) {
  return { env, organizationId: ORG, now: NOW, heartbeatAt };
}

describe("commercial flags", () => {
  it("keeps manual estimates enabled while commercial AI is disabled", () => {
    const controls = readCommercialControls(
      input({
        ...readyEnv(),
        COMMERCIAL_AI_ENABLED: "0",
      }),
    );
    expect(controls.estimates.enabled).toBe(true);
    expect(controls.ai.enabled).toBe(false);
    expect(controls.ai.reasons).toContain("disabled");
  });

  it("enables commercial AI only when every production gate passes", () => {
    const controls = readCommercialControls(input(readyEnv()));
    expect(controls.ai.enabled).toBe(true);
    expect(controls.ai.reasons).toEqual([]);
    expect(
      commercialCapabilityAllowed("ai", input(readyEnv())),
    ).toEqual({ ok: true });
  });

  it.each([
    ["workflow-tests", { COMMERCIAL_WORKFLOW_TESTS_PASSED: "estimates,approvals" }],
    ["worker-heartbeat", {}],
    ["scanner", { CLAMAV_HOST: "" }],
    ["extraction-provider", { AI_DOCUMENT_MODEL: "" }],
    ["model-provider", { AI_COMMERCIAL_MODEL: "", AI_GATEWAY_MODEL: "" }],
    ["data-residency", { COMMERCIAL_DATA_RESIDENCY_APPROVED: "0" }],
    ["evaluation-geometry", { COMMERCIAL_AI_EVALUATION_PASSED: "price,prompt-injection,citation,cross-organization" }],
    ["evaluation-price", { COMMERCIAL_AI_EVALUATION_PASSED: "geometry,prompt-injection,citation,cross-organization" }],
    ["evaluation-prompt-injection", { COMMERCIAL_AI_EVALUATION_PASSED: "geometry,price,citation,cross-organization" }],
    ["evaluation-citation", { COMMERCIAL_AI_EVALUATION_PASSED: "geometry,price,prompt-injection,cross-organization" }],
    ["evaluation-cross-organization", { COMMERCIAL_AI_EVALUATION_PASSED: "geometry,price,prompt-injection,citation" }],
    ["cost-limit", { COMMERCIAL_AI_MONTHLY_COST_LIMIT_CENTS: "0" }],
    ["rate-limit", { COMMERCIAL_AI_RATE_LIMIT_PER_HOUR: "" }],
  ] as const)("refuses commercial AI without %s", (reason, patch) => {
    const heartbeatAt = reason === "worker-heartbeat" ? null : NOW;
    const controls = readCommercialControls(
      input({ ...readyEnv(), ...patch }, heartbeatAt),
    );
    expect(controls.ai.enabled).toBe(false);
    expect(controls.ai.reasons).toContain(reason);
    expect(controls.estimates.enabled).toBe(true);
  });

  it("scopes a capability to one organization", () => {
    const env = {
      ...readyEnv(),
      COMMERCIAL_ORGANIZATION_IDS: "11111111-1111-4111-8111-111111111111",
      COMMERCIAL_FLAG_OVERRIDES: JSON.stringify({
        [ORG]: { COMMERCIAL_AI_ENABLED: "0" },
      }),
    };
    const otherOrg = readCommercialControls(input(env));
    expect(otherOrg.ai.enabled).toBe(false);
    expect(otherOrg.estimates.reasons).toContain("organization");
    const overridden = readCommercialControls({
      ...input({
        ...readyEnv(),
        COMMERCIAL_FLAG_OVERRIDES: JSON.stringify({
          [ORG]: { COMMERCIAL_AI_ENABLED: "0" },
        }),
      }),
    });
    expect(overridden.estimates.enabled).toBe(true);
    expect(overridden.ai.enabled).toBe(false);
    expect(overridden.ai.reasons).toContain("disabled");
  });

  it("leaves an unset flag available outside production and closed in production", () => {
    const development = readCommercialControls(
      input({ NODE_ENV: "test" }, null),
    );
    expect(development.estimates.legacyUnset).toBe(true);
    expect(development.ai.legacyUnset).toBe(true);
    expect(commercialCapabilityAllowed("estimates", input({ NODE_ENV: "test" }, null)).ok).toBe(
      true,
    );

    const production = readCommercialControls(
      input({ NODE_ENV: "production" }, null),
    );
    expect(production.estimates.enabled).toBe(false);
    expect(production.estimates.legacyUnset).toBe(false);
    expect(production.ai.legacyUnset).toBe(false);

    const demo = readCommercialControls(
      input({ NODE_ENV: "production", OPS_DEMO: "1" }, null),
    );
    expect(demo.estimates.legacyUnset).toBe(true);
  });

  it("rejects a stale worker heartbeat", () => {
    expect(isWorkerHeartbeatHealthy(new Date(NOW.getTime() - 61_000), NOW)).toBe(false);
    expect(isWorkerHeartbeatHealthy(NOW, NOW)).toBe(true);
  });
});
