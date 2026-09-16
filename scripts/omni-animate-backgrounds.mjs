#!/usr/bin/env node
/**
 * Batch Gemini Omni Flash image-to-video for Strong Foam scroll-world backgrounds.
 *
 * Usage (from repo root):
 *   node scripts/omni-animate-backgrounds.mjs
 *   node scripts/omni-animate-backgrounds.mjs --priority
 *   node scripts/omni-animate-backgrounds.mjs 02 04 05 07 13
 *   node scripts/omni-animate-backgrounds.mjs --all
 *   node scripts/omni-animate-backgrounds.mjs --aspect 9:16 01
 *
 * Requires GEMINI_API_KEY or GOOGLE_API_KEY in .env.local
 * Uses OpenMontage GeminiOmniVideo from ClaudeSkills (or OPENMONTAGE_ROOT).
 */
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BG = join(ROOT, "assets/backgrounds");
const OUT_ROOT = join(ROOT, "assets/animated");
const PROMPTS_PATH = join(OUT_ROOT, "prompts.json");
const MANIFEST_PATH = join(OUT_ROOT, "manifest.json");

const OPENMONTAGE =
  process.env.OPENMONTAGE_ROOT ||
  "/Users/cbsuperpatch/Desktop/ClaudeSkills/skills/community/openmontage";

const PY =
  process.env.OMNI_PYTHON ||
  "/Users/cbsuperpatch/Desktop/Superpatch_Context/content-studio/superpatch-backend/venv/bin/python";

/** Hero / first-viewport priority from SCROLL-BG-SHORTLIST */
const PRIORITY_IDS = ["02", "04", "05", "07", "13"];

function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  const vals = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    vals[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return vals;
}

function parseArgs(argv) {
  const forceAll = argv.includes("--all");
  const priority = argv.includes("--priority");
  let aspectOverride = null;
  const aspectIdx = argv.indexOf("--aspect");
  if (aspectIdx !== -1) aspectOverride = argv[aspectIdx + 1] || null;
  const nums = argv.filter((a) => /^\d{2}$/.test(a));
  return { forceAll, priority, aspectOverride, nums };
}

function aspectDir(aspect) {
  return aspect === "16:9" ? "16x9" : "9x16";
}

function extractLastFrame(videoPath, bridgePath) {
  mkdirSync(dirname(bridgePath), { recursive: true });
  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-sseof",
      "-0.1",
      "-i",
      videoPath,
      "-frames:v",
      "1",
      bridgePath,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`ffmpeg last-frame failed: ${r.stderr?.slice(0, 400)}`);
  }
}

function runOmni({ apiKey, platePath, prompt, aspect, duration, outputPath }) {
  const code = `
import json, os, sys
sys.path.insert(0, ${JSON.stringify(OPENMONTAGE)})
os.environ["GEMINI_API_KEY"] = ${JSON.stringify(apiKey)}
os.environ["GOOGLE_API_KEY"] = ${JSON.stringify(apiKey)}
from tools.video.gemini_omni_video import GeminiOmniVideo

tool = GeminiOmniVideo()
result = tool.execute({
    "prompt": ${JSON.stringify(prompt)},
    "operation": "image_to_video",
    "aspect_ratio": ${JSON.stringify(aspect)},
    "duration": ${JSON.stringify(String(duration))},
    "reference_image_paths": [${JSON.stringify(platePath)}],
    "output_path": ${JSON.stringify(outputPath)},
    "store": True,
})
print(json.dumps({
    "success": result.success,
    "error": result.error,
    "data": result.data,
    "cost_usd": result.cost_usd,
    "duration_seconds": result.duration_seconds,
}))
if not result.success:
    sys.exit(1)
`;
  return new Promise((resolvePromise, reject) => {
    const child = spawn(PY, ["-"], {
      env: { ...process.env, GEMINI_API_KEY: apiKey, GOOGLE_API_KEY: apiKey },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `python exit ${code}`));
        return;
      }
      const lines = stdout.trim().split("\n");
      const last = lines[lines.length - 1];
      try {
        resolvePromise(JSON.parse(last));
      } catch {
        reject(new Error(`Bad tool JSON: ${last?.slice(0, 400)}`));
      }
    });
    child.stdin.write(code);
    child.stdin.end();
  });
}

async function main() {
  if (!existsSync(PY)) {
    console.error(`Python missing: ${PY}`);
    process.exit(1);
  }
  if (!existsSync(OPENMONTAGE)) {
    console.error(`OpenMontage missing: ${OPENMONTAGE}`);
    process.exit(1);
  }
  if (!existsSync(PROMPTS_PATH)) {
    console.error(`Missing ${PROMPTS_PATH}`);
    process.exit(1);
  }

  const env = loadEnvLocal();
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY / GOOGLE_API_KEY missing in .env.local");
    process.exit(1);
  }

  const { forceAll, priority, aspectOverride, nums } = parseArgs(
    process.argv.slice(2),
  );
  const pack = JSON.parse(readFileSync(PROMPTS_PATH, "utf8"));
  let plates = pack.plates;

  if (nums.length) {
    plates = plates.filter((p) => nums.includes(p.id));
  } else if (priority || (!forceAll && nums.length === 0 && !process.argv.includes("--all"))) {
    // Default: priority heroes only (cost control). Use --all for full set.
    const want = priority || nums.length === 0 ? PRIORITY_IDS : nums;
    if (!forceAll && nums.length === 0) {
      plates = plates.filter((p) => PRIORITY_IDS.includes(p.id));
      console.log(`Defaulting to priority heroes: ${PRIORITY_IDS.join(", ")}`);
      console.log(`Pass --all to animate all ${pack.plates.length} plates.`);
    } else if (priority) {
      plates = plates.filter((p) => want.includes(p.id));
    }
  }

  mkdirSync(OUT_ROOT, { recursive: true });
  const results = [];

  for (const plate of plates) {
    const aspect = aspectOverride || plate.aspect || "16:9";
    const dir = join(OUT_ROOT, aspectDir(aspect));
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(OUT_ROOT, "bridges", aspectDir(aspect)), {
      recursive: true,
    });

    const platePath = join(BG, plate.file);
    const outName = `sf-bg-${plate.id}-${plate.slug}_omni.mp4`;
    const outPath = join(dir, outName);
    const bridgePath = join(
      OUT_ROOT,
      "bridges",
      aspectDir(aspect),
      `sf-bg-${plate.id}-${plate.slug}_last.png`,
    );

    if (!existsSync(platePath)) {
      results.push({
        id: plate.id,
        aspect,
        ok: false,
        error: `missing ${platePath}`,
      });
      continue;
    }
    if (!forceAll && existsSync(outPath)) {
      console.log(`SKIP ${aspect} ${plate.id} (exists)`);
      results.push({
        id: plate.id,
        aspect,
        ok: true,
        skipped: true,
        out: outPath,
      });
      continue;
    }

    console.log(`\n=== Omni ${aspect} ${plate.id} ${plate.slug} (${plate.use}) ===`);
    try {
      const result = await runOmni({
        apiKey,
        platePath,
        prompt: plate.prompt,
        aspect,
        duration: pack.duration || "8",
        outputPath: outPath,
      });
      try {
        extractLastFrame(outPath, bridgePath);
      } catch (e) {
        console.warn(`bridge extract warn: ${e.message}`);
      }
      results.push({
        id: plate.id,
        slug: plate.slug,
        aspect,
        use: plate.use,
        ok: true,
        out: outPath,
        bridge: bridgePath,
        interaction_id: result.data?.interaction_id,
        cost_usd: result.cost_usd,
        duration_seconds: result.duration_seconds,
      });
      console.log(`OK ${outName}`);
    } catch (e) {
      console.error(`FAIL ${plate.id}: ${e.message?.slice(0, 400)}`);
      results.push({
        id: plate.id,
        aspect,
        ok: false,
        error: String(e.message || e).slice(0, 800),
      });
    }
  }

  const manifest = {
    model: pack.model,
    generatedAt: new Date().toISOString(),
    openmontage: OPENMONTAGE,
    results,
    okCount: results.filter((r) => r.ok).length,
    failCount: results.filter((r) => !r.ok).length,
    cost_usd_sum: results.reduce((s, r) => s + (r.cost_usd || 0), 0),
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(
    `\nDone ok=${manifest.okCount} fail=${manifest.failCount} cost~$${manifest.cost_usd_sum.toFixed(2)}`,
  );
  console.log(`manifest: ${MANIFEST_PATH}`);
  if (manifest.failCount) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
