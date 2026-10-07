import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ACCOUNT_ID = "6f6959ecba86d1de4d6cf6aa0b34528d";
const WORKER_NAME = "strongfoam";
const HANDOFF_D1 = "b2be192c-db0d-447f-8d7c-b2c4d39df274";
const FORBIDDEN_WORKERS = [
  "abracadabra-marketing",
  "handoff",
  "handoff-hq",
  "readiness-check",
];
const FORBIDDEN_HOSTS = [
  "abra-ca-dabra.app",
  "www.abra-ca-dabra.app",
  "check.abra-ca-dabra.app",
  "handoff.abra-ca-dabra.app",
  "hq.abra-ca-dabra.app",
];
const FORBIDDEN_QUEUES = ["lead-intake", "github-events", "scan-jobs"];

function readJsonc(path: string) {
  const text = readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(text) as Record<string, unknown>;
}

describe("Cloudflare Worker deploy config", () => {
  it("publishes strongfoam with its own Cloudflare resources", () => {
    const config = readJsonc("wrangler.jsonc");
    const serialized = JSON.stringify(config);

    expect(config.name).toBe(WORKER_NAME);
    expect(config.account_id).toBe(ACCOUNT_ID);
    expect(config.main).toBe("cloudflare-worker.ts");
    expect(config.compatibility_date).toBe("2026-10-06");
    expect(config.compatibility_flags).toEqual([
      "nodejs_compat",
      "global_fetch_strictly_public",
    ]);
    expect(config.workers_dev).toBe(true);
    expect(config.assets).toEqual({
      directory: ".open-next/assets",
      binding: "ASSETS",
    });
    expect(config.services).toEqual([
      { binding: "WORKER_SELF_REFERENCE", service: WORKER_NAME },
    ]);
    expect(config.alias).toEqual({
      "server-only": "./node_modules/server-only/empty.js",
    });
    expect(config.ai).toEqual({ binding: "AI" });
    expect(config.d1_databases).toEqual([
      {
        binding: "DB",
        database_name: "strongfoam",
        database_id: expect.any(String),
        migrations_dir: "migrations",
      },
    ]);
    expect(config.r2_buckets).toEqual([
      { binding: "FILES", bucket_name: "strongfoam" },
    ]);
    expect(config.queues).toMatchObject({
      producers: [{ binding: "JOBS", queue: "strongfoam-jobs" }],
      consumers: [
        {
          queue: "strongfoam-jobs",
          dead_letter_queue: "strongfoam-jobs-dlq",
        },
      ],
    });
    expect(config.durable_objects).toEqual({
      bindings: [{ name: "STRONGFOAM_AGENT", class_name: "StrongfoamAgent" }],
    });
    expect(config.triggers).toEqual({ crons: ["15 9 * * *"] });
    expect(config.vars).toMatchObject({
      AI_GATEWAY_ID: "strongfoam",
      AI_GATEWAY_ACCOUNT_ID: ACCOUNT_ID,
    });
    expect(config.routes).toBeUndefined();
    expect(serialized).not.toContain("NEXT_INC_CACHE_R2_BUCKET");
    expect(serialized).not.toContain(HANDOFF_D1);
    for (const name of FORBIDDEN_WORKERS) expect(config.name).not.toBe(name);
    for (const host of FORBIDDEN_HOSTS) expect(serialized).not.toContain(host);
    for (const queue of FORBIDDEN_QUEUES) expect(serialized).not.toContain(queue);
  });

  it("keeps OpenNext deploy scripts and the Strongfoam agent", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.scripts.preview).toBe(
      "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    );
    expect(pkg.scripts.deploy).toBe(
      "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    );
    expect(pkg.dependencies.next).toBe("16.3.8");
    expect(pkg.dependencies["@opennextjs/cloudflare"]).toBe("^1.20.8");
    expect(pkg.dependencies.agents).toMatch(/^\^0\.26\./);
    expect(pkg.devDependencies["eslint-config-next"]).toBe("16.3.8");
    expect(pkg.devDependencies.wrangler).toBe("^4.147.0");

    const openNext = readFileSync("open-next.config.ts", "utf8");
    expect(openNext).toContain("defineCloudflareConfig()");
    expect(openNext).not.toContain("NEXT_INC_CACHE_R2_BUCKET");
    expect(openNext).not.toContain("r2IncrementalCache");

    const worker = readFileSync("cloudflare-worker.ts", "utf8");
    expect(worker).toContain("fetch: handler.fetch");
    expect(worker).toContain("StrongfoamAgent");
    expect(worker).toContain("queue(batch");
    expect(worker).toContain("scheduled(");
    expect(worker).toContain('from "./.open-next/cloudflare/init.js"');
    expect(worker.match(/runWithCloudflareRequestContext\(/g)?.length).toBe(2);

    const agent = readFileSync("src/lib/cloudflare/agent.ts", "utf8");
    expect(agent).toContain("extends Agent");
    expect(agent).toContain("completeThroughGateway");
    expect(agent).toContain("startAgentRun");

    const nextConfig = readFileSync("next.config.ts", "utf8");
    expect(nextConfig).toContain("initOpenNextCloudflareForDev");
    expect(nextConfig).toContain("reactCompiler: true");

    expect(readFileSync("tsconfig.json", "utf8")).toContain("cloudflare-worker.ts");
    const eslint = readFileSync("eslint.config.mjs", "utf8");
    expect(eslint).toContain(".open-next/**");
    expect(eslint).toContain(".wrangler/**");
    expect(eslint).toContain("cloudflare-worker.ts");
    const gitignore = readFileSync(".gitignore", "utf8");
    expect(gitignore).toContain(".open-next/");
    expect(gitignore).toContain(".wrangler/");
    expect(gitignore).toContain(".dev.vars");
  });
});
