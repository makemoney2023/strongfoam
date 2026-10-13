// Generates web derivatives for approved (publish) page media from the
// external SFI WEBSITE source folder. Source masters are never copied.
// Usage: node scripts/build-page-media.mjs --source "/path/to/SFI WEBSITE"
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Image derivative profiles. Widths are max widths; never upscaled. */
export const IMAGE_JOBS = [
  { source: "SFI- IMAGES/IMG_7930.jpeg", out: "projects/IMG_7930", widths: [1600, 960] },
  { source: "SFI- IMAGES/IMG_7881.jpeg", out: "services/IMG_7881", widths: [1600, 960] },
  { source: "SFI- IMAGES/IMG_7996 2.jpeg", out: "services/IMG_7996-2", widths: [1600, 960] },
  { source: "SFI- IMAGES/IMG_9636.jpeg", out: "services/IMG_9636", widths: [1600, 960] },
  { source: "SFI- IMAGES/IMG_9642.jpeg", out: "services/IMG_9642", widths: [1200, 720] },
  { source: "SFI- IMAGES/IMG_9678.jpeg", out: "services/IMG_9678", widths: [1200, 720] },
];

/** Portrait service videos: muted H.264, faststart, plus a poster. */
export const VIDEO_JOBS = [
  { source: "SFI- IMAGES/2688129a-064d-4092-93a9-224d9407d1b3.mp4", out: "services/sf-spray-foam-framed-wall", start: 2, duration: 12 },
  { source: "SFI- IMAGES/71ccc8f7-bbe3-44ca-8417-55d8492f470b.mp4", out: "services/sf-spray-foam-overhead", start: 4, duration: 12 },
];

const L = "SFI Client Logo's/";
const SUP = "SFI Client Logo's/SFI Supplier Logo.docx#";
/** Owner-permitted partner logos (2026-10-13). `#` reads word/media/<name> from a docx. */
export const LOGO_JOBS = [
  ["basf", SUP + "image1.png"],
  ["genyk", L + "Genyk Logo.png"],
  ["soprema", L + "SOPREMA LOGO.png"],
  ["henry", SUP + "image4.png"],
  ["gcp-grace", L + "GCP LOGO.png"],
  ["carboline", SUP + "image9.png"],
  ["hilti", SUP + "image6.png"],
  ["sherwin-williams", SUP + "image8.png"],
  ["3m", SUP + "image5.png"],
  ["dakon-construction", L + "Dakon-Construction.png"],
  ["blockwall", L + "blockwall_logo.jpg"],
  ["mcc", L + "mcc1.png"],
  ["sem-construction", L + "sem-construction-logo.png"],
  ["southside-construction", L + "0.png"],
  ["melloul-blamey", L + "J_3EqG67_400x400.jpg"],
  ["graceview", L + "Unknown-1.jpeg"],
  ["stonerise", L + "Unknown-1.png"],
  ["k-and-l-construction", L + "Unknown-2.jpeg"],
  ["auburn-developments", L + "Unknown-2.png"],
  ["drewlo", L + "Unknown-3.jpeg"],
  ["devlan-construction", L + "Unknown-4.jpeg"],
  ["hayman-construction", L + "Unknown-4.png"],
  ["d-grant-construction", L + "Unknown-5.jpeg"],
  ["zehr", L + "Unknown-5.png"],
  ["tonda", L + "Unknown-6.jpeg"],
  ["magil-construction", L + "Unknown-6.png"],
  ["sierra-construction", L + "Unknown-7.png"],
  ["bronnenco-construction", L + "Unknown-8.png"],
  ["csl", L + "Unknown.png"],
];

async function readLogo(sourceRoot, ref) {
  const [file, member] = ref.split("#");
  if (!member) return readFile(join(sourceRoot, file));
  return execFileSync("unzip", ["-p", join(sourceRoot, file), `word/media/${member}`], { maxBuffer: 1 << 26 });
}

/** Knock a near-white background out to transparency (soft edge). */
async function knockOutWhite(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    if (min > 235) data[i + 3] = Math.round(data[i + 3] * Math.max(0, (255 - min) / 20));
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

/**
 * Trim, remove the white plate, then scale every mark to the same visual
 * area (not the same height) and centre it on a fixed 320x120 transparent
 * canvas so wide wordmarks and square badges read at a similar weight.
 */
const LOGO_CANVAS = { width: 320, height: 120, area: 120 * 120 * 1.9 };
async function buildLogos(sourceRoot) {
  await mkdir(join(root, "assets/partners"), { recursive: true });
  for (const [slug, ref] of LOGO_JOBS) {
    const raw = await readLogo(sourceRoot, ref);
    const clear = await knockOutWhite(await sharp(raw).trim({ threshold: 18 }).toBuffer());
    const trimmed = await sharp(clear).trim({ threshold: 1 }).toBuffer();
    const meta = await sharp(trimmed).metadata();
    let scale = Math.sqrt(LOGO_CANVAS.area / (meta.width * meta.height));
    scale = Math.min(scale, (LOGO_CANVAS.width - 16) / meta.width, (LOGO_CANVAS.height - 16) / meta.height);
    const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale);
    const mark = await sharp(trimmed).resize(w, h).toBuffer();
    const canvas = sharp({ create: { ...LOGO_CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: mark, left: Math.round((LOGO_CANVAS.width - w) / 2), top: Math.round((LOGO_CANVAS.height - h) / 2) }]);
    const buf = await canvas.png().toBuffer();
    await sharp(buf).webp({ quality: 90, alphaQuality: 100 }).toFile(join(root, `assets/partners/${slug}.webp`));
    await sharp(buf).png({ compressionLevel: 9 }).toFile(join(root, `assets/partners/${slug}.png`));
  }
}

/** Owner-approved site media plan (assets/page-media.json). */
async function buildPlan(sourceRoot) {
  const plan = JSON.parse(await readFile(join(root, "assets/page-media.json"), "utf8"));
  for (const item of plan.items) {
    // `source` is the manifest keeper; `downloadedAs` names an identical copy.
    const input = join(sourceRoot, item.downloadedAs ?? item.source);
    const base = join(root, "assets", item.out);
    await mkdir(dirname(base), { recursive: true });
    if (item.kind === "image") {
      for (const width of item.widths) {
        const img = () => sharp(input).rotate().resize({ width, withoutEnlargement: true });
        await img().webp({ quality: 78 }).toFile(`${base}-${width}.webp`);
        await img().avif({ quality: 55 }).toFile(`${base}-${width}.avif`);
      }
    } else {
      execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(item.start), "-t", String(item.duration), "-i", input, "-an", "-vf", `scale=-2:${item.height},fps=30,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-profile:v", "high", "-movflags", "+faststart", `${base}.mp4`]);
      execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(item.start + 1), "-i", input, "-frames:v", "1", "-vf", `scale=-2:${item.height},format=yuvj420p`, "-q:v", "3", `${base}-poster.jpg`]);
    }
  }
}

async function run(sourceRoot) {
  await buildLogos(sourceRoot);
  if (process.argv.includes("--logos-only")) return;
  await buildPlan(sourceRoot);
  if (process.argv.includes("--plan-only")) return;
  for (const job of IMAGE_JOBS) {
    const input = join(sourceRoot, job.source);
    await mkdir(join(root, "assets", dirname(job.out)), { recursive: true });
    for (const width of job.widths) {
      const base = join(root, "assets", `${job.out}-${width}`);
      const img = () => sharp(input).rotate().resize({ width, withoutEnlargement: true });
      await img().webp({ quality: 78 }).toFile(`${base}.webp`);
      await img().avif({ quality: 55 }).toFile(`${base}.avif`);
    }
  }
  for (const job of VIDEO_JOBS) {
    const input = join(sourceRoot, job.source);
    const base = join(root, "assets", job.out);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(job.start), "-t", String(job.duration), "-i", input, "-an", "-vf", "scale=-2:640,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-profile:v", "high", "-movflags", "+faststart", `${base}.mp4`]);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(job.start + 1), "-i", input, "-frames:v", "1", "-vf", "scale=-2:640,format=yuvj420p", "-q:v", "3", `${base}-poster.jpg`]);
  }
  // Brand lockups from the supplied vector PDFs.
  execFileSync("pdftocairo", ["-svg", join(sourceRoot, "Logo - Strong Foam Insulation.pdf"), join(root, "assets/brand/strongfoam-logo.svg")]);
  const fire = join(root, "assets/brand/strongfire-logo.svg");
  execFileSync("pdftocairo", ["-svg", join(sourceRoot, "Strong Fire 2.pdf"), fire]);
  // Crop the letter-size artboard to the lockup (keeps its dark plate).
  // Crop the letter-size artboard to the lockup and drop its dark plate.
  const svg = (await readFile(fire, "utf8"))
    .replace('width="792" height="612" viewBox="0 0 792 612"', 'width="772" height="240" viewBox="10 185 772 240"')
    .replace(/<rect[^>]*\/>/, "");
  await writeFile(join(root, "assets/brand/strongfire-logo-on-dark.svg"), svg);
  // On light backgrounds the white "STRONG" / "PROTECTION" become ink.
  await writeFile(fire, svg.replaceAll('fill="rgb(100%, 100%, 100%)"', 'fill="rgb(9%, 13%, 17%)"'));
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const i = process.argv.indexOf("--source");
  if (i < 0) throw new Error("--source is required");
  await run(process.argv[i + 1]);
}
