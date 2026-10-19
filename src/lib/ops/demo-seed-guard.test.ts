import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertDemoSeedAllowed, bindingLooksRemote, demoSeedRefusal } from "@/lib/ops/demo-seed-guard";

describe("demo seed guard", () => {
  it("refuses when OPS_DEMO is unset", () => {
    expect(demoSeedRefusal({ env: {} })).toMatch(/OPS_DEMO/);
    expect(() => assertDemoSeedAllowed({ env: {} })).toThrow(/OPS_DEMO/);
  });

  it("refuses a remote binding or --remote", () => {
    const env = { OPS_DEMO: "1" };
    expect(demoSeedRefusal({ env, remoteBinding: true })).toMatch(/remote/);
    expect(demoSeedRefusal({ env, argv: ["wrangler", "dev", "--remote"] })).toMatch(/--remote/);
    expect(demoSeedRefusal({ env: { OPS_DEMO: "1", WRANGLER_REMOTE: "1" } })).toMatch(/remote/);
    expect(demoSeedRefusal({ env: { OPS_DEMO: "1", CF_D1_REMOTE: "1" } })).toMatch(/remote/);
    expect(bindingLooksRemote({ remote: true })).toBe(true);
    expect(demoSeedRefusal({ env, remoteBinding: bindingLooksRemote({ mode: "remote" }) })).toMatch(/remote/);
  });

  it("allows a local demo", () => {
    expect(demoSeedRefusal({ env: { OPS_DEMO: "1" }, argv: ["next", "dev"] })).toBeNull();
  });

  it("does not contain a D1 execute or a database open in the demo script", () => {
    const source = readFileSync(new URL("../../../scripts/demo/golden-path.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/d1 execute|getDb\(/);
  });
});
