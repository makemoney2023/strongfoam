import { assertDemoSeedAllowed } from "@/lib/ops/demo-seed-guard";
import { GOLDEN_PATH_URLS } from "@/lib/ops/golden-path";

assertDemoSeedAllowed({
  env: process.env,
  argv: process.argv,
});

const reset = process.argv.includes("--reset");
console.log("This command does not open the database.");
if (reset) {
  console.log("Stop the dev server and start it again without DEMO_GOLDEN.");
  console.log("The warehouse rows live in that server's memory.");
  process.exit(0);
}

console.log("Start the recording server with:");
console.log("  OPS_DEMO=1 DEMO_GOLDEN=1 npm run dev");
console.log("Local worker, still without remote bindings:");
console.log("  OPS_DEMO=1 DEMO_GOLDEN=1 npx wrangler dev");
console.log("Do not pass --remote. Do not set WRANGLER_REMOTE, CF_D1_REMOTE, or DEMO_DB_REMOTE.");
console.log("Office: admin@strongfoam.demo / StrongFoamDemo1!");
console.log("Field: field@strongfoam.demo / StrongFoamDemo1!");
for (const [name, url] of Object.entries(GOLDEN_PATH_URLS)) {
  console.log(`${name}: ${url}`);
}
