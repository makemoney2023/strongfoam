import { describe, expect, it } from "vitest";
import { OPS_SESSION_COOKIE, verifyOpsSession } from "@/lib/ops/auth";
import { POST } from "@/app/api/ops/login/route";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
} from "@/lib/ops/demo-data";

describe("POST /api/ops/login", () => {
  it("rejects unknown staff and sets a session for configured staff", async () => {
    process.env.OPS_SESSION_SECRET = "ops-secret-for-route-tests";
    process.env.OPS_STAFF_EMAILS = "estimating@strongfoam.com";
    process.env.OPS_STAFF_PASSWORD = "secret-password";

    const denied = await POST(
      new Request("http://localhost/api/ops/login", {
        method: "POST",
        body: new URLSearchParams({
          email: "visitor@example.com",
          password: "secret-password",
        }),
      }),
    );
    expect(denied.status).toBe(303);
    expect(denied.headers.get("location")).toContain("/app/login?error=1");

    const allowed = await POST(
      new Request("http://localhost/api/ops/login", {
        method: "POST",
        body: new URLSearchParams({
          email: "Estimating@StrongFoam.com",
          password: "secret-password",
        }),
      }),
    );
    expect(allowed.status).toBe(303);
    expect(allowed.headers.get("location")).toBe("http://localhost/app");
    const cookie = allowed.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(OPS_SESSION_COOKIE);
    const token = cookie.split(";")[0]?.split("=")[1] ?? "";
    expect(verifyOpsSession(decodeURIComponent(token), process.env.OPS_SESSION_SECRET)).not.toBeNull();
  });

  it("signs in an individual administrator without the shared password", async () => {
    process.env.OPS_SESSION_SECRET = "ops-secret-for-route-tests";
    process.env.OPS_STAFF_EMAILS = "";
    process.env.OPS_STAFF_PASSWORD = "";
    const response = await POST(
      new Request("http://localhost/api/ops/login", {
        method: "POST",
        body: new URLSearchParams({
          email: DEMO_ADMIN_EMAIL,
          password: DEMO_ADMIN_PASSWORD,
        }),
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/app");
    const cookie = response.headers.get("set-cookie") ?? "";
    const token = cookie.split(";")[0]?.split("=")[1] ?? "";
    expect(
      verifyOpsSession(
        decodeURIComponent(token),
        process.env.OPS_SESSION_SECRET,
      ),
    ).toMatchObject({
      email: DEMO_ADMIN_EMAIL,
      role: "administrator",
      sessionVersion: 1,
    });
  });

  it("redirects to the Host header when the process is bound to 0.0.0.0", async () => {
    process.env.OPS_SESSION_SECRET = "ops-secret-for-route-tests";
    process.env.OPS_STAFF_EMAILS = "";
    process.env.OPS_STAFF_PASSWORD = "";
    const response = await POST(
      new Request("http://0.0.0.0:3000/api/ops/login", {
        method: "POST",
        headers: { host: "127.0.0.1:3000" },
        body: new URLSearchParams({
          email: DEMO_ADMIN_EMAIL,
          password: DEMO_ADMIN_PASSWORD,
        }),
      }),
    );
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/app");
  });
});
