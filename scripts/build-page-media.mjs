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
const CLI = "SFI Client Logo's/Client Logo-Website.docx#";
/** Owner-permitted partner logos (2026-10-13). `#` reads word/media/<name> from a docx. */
export const LOGO_JOBS = [
  ["basf", SUP + "image1.png"],
  ["genyk", L + "Genyk Logo.png"],
  ["soprema", L + "SOPREMA LOGO.png"],
  ["henry", L + "Henry Logo.png"],
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
  ["melloul-blamey", L + "J_3EqG67_400x400.jpg", { inset: 12 }],
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
  ["bronnenco-construction", L + "Unknown-8.png", { inset: 16 }],
  ["csl", L + "Unknown.png"],
  ["perlane-construction", CLI + "image11.png"],
  ["reid-deleye", CLI + "image13.png"],
  ["remo-general-contracting", CLI + "image16.jpg"],
  ["vicano-construction", CLI + "image7.png"],
];

async function readLogo(sourceRoot, ref) {
  const [file, member] = ref.split("#");
  if (!member) return readFile(join(sourceRoot, file));
  return execFileSync("unzip", ["-p", join(sourceRoot, file), `word/media/${member}`], { maxBuffer: 1 << 26 });
}

/** Most common colour along the border of a trimmed mark = its background. */
function borderColour(data, { width, height, channels }, inset = 0) {
  const counts = new Map();
  const add = (x, y) => {
    const i = (y * width + x) * channels;
    const key = [data[i], data[i + 1], data[i + 2]].map((v) => v >> 4).join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  const d = inset;
  for (let x = d; x < width - d; x++) { add(x, d); add(x, height - 1 - d); }
  for (let y = d; y < height - d; y++) { add(d, y); add(width - 1 - d, y); }
  const [key] = [...counts].sort((p, q) => q[1] - p[1])[0];
  return key.split(",").map((v) => (Number(v) << 4) + 8);
}

/**
 * Two variants from one source:
 * - `{slug}.webp|png`      full colour, light background plate removed
 * - `{slug}-mono.webp|png` reversed white ink on transparency for dark surfaces
 * Ink alpha = distance from the detected background colour, so boxed marks
 * (Henry, Hilti, Tonda) keep their lettering as knock-outs.
 */
async function processLogo(input, { inset = 0 } = {}) {
  const { data, info } = await sharp(input).flatten({ background: "#ffffff" }).trim({ threshold: 18 })
    .resize({ height: 240, kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = borderColour(data, info, inset);
  const lightBg = bg.every((v) => v > 200);
  const n = info.width * info.height;
  const colour = Buffer.alloc(n * 4), mono = Buffer.alloc(n * 4);
  for (let p = 0; p < n; p++) {
    const i = p * info.channels;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const ink = Math.max(0, Math.min(1, (Math.hypot(r - bg[0], g - bg[1], b - bg[2]) - 18) / 70));
    colour.set([r, g, b, lightBg ? Math.round(ink * 255) : 255], p * 4);
    mono.set([255, 255, 255, Math.round(ink * 255)], p * 4);
  }
  const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
  const tight = async (buf) => sharp(await sharp(buf, raw).png().toBuffer()).trim({ threshold: 1 }).png().toBuffer();
  return { colour: await tight(colour), mono: await tight(mono) };
}

async function buildLogos(sourceRoot) {
  const dir = join(root, "assets/partners");
  await mkdir(dir, { recursive: true });
  const meta = {};
  for (const [slug, ref, options] of LOGO_JOBS) {
    const raw = await readLogo(sourceRoot, ref);
    const src = await sharp(await sharp(raw).flatten({ background: "#fff" }).trim({ threshold: 18 }).toBuffer()).metadata();
    const { colour, mono } = await processLogo(raw, options);
    // ~2x a 56px display height, capped by what the source can honestly give.
    const outH = Math.min(112, Math.max(56, src.height * 2));
    for (const [suffix, buf] of [["", colour], ["-mono", mono]]) {
      const img = sharp(buf).resize({ height: outH });
      await img.clone().webp({ quality: 92, alphaQuality: 100 }).toFile(join(dir, `${slug}${suffix}.webp`));
      await img.clone().png({ compressionLevel: 9 }).toFile(join(dir, `${slug}${suffix}.png`));
    }
    const m = await sharp(join(dir, `${slug}-mono.png`)).metadata();
    meta[slug] = { width: m.width, height: m.height, sourceWidth: src.width, sourceHeight: src.height, lowRes: src.height < 48 || src.width < 150 };
  }
  await writeFile(join(dir, "logos.json"), JSON.stringify(meta, null, 1) + "\n");
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
      // `frameAt` pulls a lossless still from a video source; `crop` is [left, top, width, height].
      let still = item.frameAt === undefined ? undefined : execFileSync("ffmpeg", ["-loglevel", "error", "-ss", String(item.frameAt), "-i", input, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 64 * 1024 * 1024 });
      if (item.crop) {
        const [left, top, width, height] = item.crop;
        still = await sharp(still ?? input).rotate().extract({ left, top, width, height }).png().toBuffer();
      }
      for (const width of item.widths) {
        const img = () => sharp(still ?? input).rotate().resize({ width, withoutEnlargement: true });
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
