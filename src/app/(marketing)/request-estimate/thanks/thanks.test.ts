import { describe, expect, it } from "vitest";
import { signLeadId } from "@/lib/leads/hmac";
import { resolveThanksView } from "@/app/(marketing)/request-estimate/thanks/resolve-thanks-view";

const secret = "test-secret-test-secret-test-secret";

describe("resolveThanksView", () => {
  it("hides Calendly when HMAC is wrong", async () => {
    const view = await resolveThanksView({
      lid: "lead-1",
      k: "nope",
      secret,
      loadLead: async () => ({
        status: "qualified",
        firstName: "Alex",
        lastName: "Lee",
        email: "alex@gc.example",
      }),
    });
    expect(view.showCalendly).toBe(false);
  });

  it("shows Calendly only for verified qualified leads", async () => {
    const view = await resolveThanksView({
      lid: "lead-1",
      k: signLeadId("lead-1", secret),
      secret,
      loadLead: async () => ({
        status: "qualified",
        firstName: "Alex",
        lastName: "Lee",
        email: "alex@gc.example",
      }),
    });
    expect(view.showCalendly).toBe(true);
    expect(view.email).toBe("alex@gc.example");
  });
});
