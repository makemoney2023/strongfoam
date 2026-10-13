import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import { assertMarketingClaimsSafe } from "../src/content/claims.ts";

const execFileAsync = promisify(execFile);

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);
const VIDEO_EXTENSIONS = new Set([
  ".avi",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp4",
  ".webm",
]);
const FINAL_STATUSES = new Set(["publish", "hold", "duplicate", "reject"]);
const LOW_RESOLUTION_EDGE = 720;
const INVENTORY_SCHEMA_VERSION = 1;
const MANIFEST_SCHEMA_VERSION = 1;
const DUPLICATE_POLICY_VERSION = "pixel-area_bytes_path-v1";

export const APPROVED_SOURCE_BASELINE = Object.freeze({
  totalFiles: 576,
  images: 544,
  videos: 32,
  exactUniqueImages: 484,
  exactDuplicateGroups: 47,
  redundantImageFiles: 60,
  lowResolutionImages: 34,
  corruptImages: 0,
});

function compareText(left, right) {
  const foldedLeft = left.normalize("NFC").toLocaleLowerCase("en");
  const foldedRight = right.normalize("NFC").toLocaleLowerCase("en");
  if (foldedLeft < foldedRight) return -1;
  if (foldedLeft > foldedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizedRelativePath(root, absolutePath) {
  return relative(root, absolutePath).split(sep).join("/").normalize("NFC");
}

function stableId(prefix, value) {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function sha256File(path) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", rejectPromise);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

async function discoverMediaFiles(source) {
  const discovered = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareText(left.name, right.name));

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const extension = extname(entry.name).toLocaleLowerCase("en");
      if (IMAGE_EXTENSIONS.has(extension)) {
        discovered.push({ absolutePath, extension, kind: "image" });
      } else if (VIDEO_EXTENSIONS.has(extension)) {
        discovered.push({ absolutePath, extension, kind: "video" });
      }
    }
  }

  await walk(source);
  return discovered.sort((left, right) =>
    compareText(
      normalizedRelativePath(source, left.absolutePath),
      normalizedRelativePath(source, right.absolutePath),
    ),
  );
}

async function resolveBinary(name, env) {
  let resolvedPath;
  try {
    const { stdout } = await execFileAsync("/usr/bin/which", [name], { env });
    resolvedPath = stdout.trim();
  } catch {
    throw new Error(`Missing required binary: ${name}`);
  }

  if (!resolvedPath) {
    throw new Error(`Missing required binary: ${name}`);
  }

  try {
    const { stdout, stderr } = await execFileAsync(resolvedPath, ["-version"], {
      env,
      maxBuffer: 1024 * 1024,
    });
    const versionLine = `${stdout}\n${stderr}`
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    if (!versionLine) {
      throw new Error("empty version output");
    }
    return { path: resolvedPath, versionLine };
  } catch {
    throw new Error(`Required binary is not executable: ${name}`);
  }
}

export async function preflightMediaBinaries({ env = process.env } = {}) {
  const ffmpeg = await resolveBinary("ffmpeg", env);
  const ffprobe = await resolveBinary("ffprobe", env);
  return { ffmpeg, ffprobe };
}

function orientationFor(width, height) {
  if (!width || !height) return null;
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

function orientedDimensions(metadata) {
  if (metadata.autoOrient?.width && metadata.autoOrient?.height) {
    return {
      width: metadata.autoOrient.width,
      height: metadata.autoOrient.height,
    };
  }

  const swapsAxes =
    metadata.orientation && [5, 6, 7, 8].includes(metadata.orientation);
  return {
    width: swapsAxes ? metadata.height : metadata.width,
    height: swapsAxes ? metadata.width : metadata.height,
  };
}

export function calculateVideoSampleTimes(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [];
  }

  const candidates = [
    0.25,
    durationSeconds * 0.25,
    durationSeconds * 0.5,
    durationSeconds * 0.75,
    durationSeconds - 0.25,
  ];
  const clamped = candidates.map((value) =>
    Math.min(durationSeconds, Math.max(0, value)),
  );
  return [...new Set(clamped.map((value) => Number(value.toFixed(6))))].sort(
    (left, right) => left - right,
  );
}

async function inspectImage(absolutePath) {
  try {
    const metadata = await sharp(absolutePath).metadata();
    const { width, height } = orientedDimensions(metadata);
    if (!width || !height) {
      throw new Error("missing dimensions");
    }
    return {
      width,
      height,
      orientation: orientationFor(width, height),
      exifOrientation: metadata.orientation ?? null,
      format: metadata.format ?? null,
      pages: metadata.pages ?? 1,
      hasAlpha: metadata.hasAlpha ?? false,
      lowResolution: Math.min(width, height) < LOW_RESOLUTION_EDGE,
      error: null,
    };
  } catch {
    return {
      width: null,
      height: null,
      orientation: null,
      exifOrientation: null,
      format: null,
      pages: null,
      hasAlpha: null,
      lowResolution: null,
      error: "Image metadata unreadable",
    };
  }
}

async function inspectVideo(absolutePath, ffprobePath, env) {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        absolutePath,
      ],
      { env, maxBuffer: 10 * 1024 * 1024 },
    );
    const probe = JSON.parse(stdout);
    const videoStream = probe.streams?.find(
      (stream) => stream.codec_type === "video",
    );
    if (!videoStream) {
      throw new Error("missing video stream");
    }
    const durationSeconds = Number(
      probe.format?.duration ?? videoStream.duration,
    );
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error("invalid duration");
    }
    const encodedWidth = Number(videoStream.width);
    const encodedHeight = Number(videoStream.height);
    const rawRotation = Number(
      videoStream.side_data_list?.find(
        (entry) => entry.side_data_type === "Display Matrix",
      )?.rotation ?? videoStream.tags?.rotate ?? 0,
    );
    const rotationDegrees = Number.isFinite(rawRotation)
      ? ((rawRotation % 360) + 360) % 360
      : 0;
    const swapsAxes = rotationDegrees === 90 || rotationDegrees === 270;
    const width = swapsAxes ? encodedHeight : encodedWidth;
    const height = swapsAxes ? encodedWidth : encodedHeight;
    return {
      width,
      height,
      orientation: orientationFor(width, height),
      rotationDegrees,
      durationSeconds: Number(durationSeconds.toFixed(6)),
      codec: videoStream.codec_name ?? null,
      format: probe.format?.format_name ?? null,
      frameRate: videoStream.avg_frame_rate ?? null,
      hasAudio: Boolean(
        probe.streams?.some((stream) => stream.codec_type === "audio"),
      ),
      sampleTimesSeconds: calculateVideoSampleTimes(durationSeconds),
      error: null,
    };
  } catch {
    return {
      width: null,
      height: null,
      orientation: null,
      rotationDegrees: null,
      durationSeconds: null,
      codec: null,
      format: null,
      frameRate: null,
      hasAudio: null,
      sampleTimesSeconds: [],
      error: "Video metadata unreadable",
    };
  }
}

async function inspectFile(candidate, source, binaries, env) {
  const path = normalizedRelativePath(source, candidate.absolutePath);
  const base = {
    id: stableId("media", path),
    path,
    extension: candidate.extension,
    kind: candidate.kind,
    bytes: null,
    sha256: null,
    width: null,
    height: null,
    orientation: null,
    duplicateGroupId: null,
    keeperId: null,
    isKeeper: true,
    error: null,
  };

  try {
    const details = await stat(candidate.absolutePath);
    const sha256 = await sha256File(candidate.absolutePath);
    const metadata =
      candidate.kind === "image"
        ? await inspectImage(candidate.absolutePath)
        : await inspectVideo(
            candidate.absolutePath,
            binaries.ffprobe.path,
            env,
          );
    return {
      ...base,
      bytes: details.size,
      sha256,
      ...metadata,
    };
  } catch {
    return {
      ...base,
      error: "File bytes unreadable",
    };
  }
}

async function mapWithConcurrency(values, limit, mapper) {
  const output = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return output;
}

function applyDuplicateGroups(files) {
  const byHash = new Map();
  for (const file of files) {
    if (file.kind !== "image" || !file.sha256) continue;
    const members = byHash.get(file.sha256) ?? [];
    members.push(file);
    byHash.set(file.sha256, members);
  }

  const duplicateGroups = [];
  for (const [sha256, members] of byHash) {
    if (members.length < 2) continue;
    const ranked = [...members].sort((left, right) => {
      const leftArea = (left.width ?? 0) * (left.height ?? 0);
      const rightArea = (right.width ?? 0) * (right.height ?? 0);
      if (leftArea !== rightArea) return rightArea - leftArea;
      if (left.bytes !== right.bytes) return (right.bytes ?? 0) - (left.bytes ?? 0);
      return compareText(left.path, right.path);
    });
    const keeper = ranked[0];
    const id = stableId("duplicate", sha256);
    const memberIds = members
      .map((member) => member.id)
      .sort(compareText);
    const memberPaths = members
      .map((member) => member.path)
      .sort(compareText);

    for (const member of members) {
      member.duplicateGroupId = id;
      member.keeperId = keeper.id;
      member.isKeeper = member.id === keeper.id;
    }

    duplicateGroups.push({
      id,
      sha256,
      keeperId: keeper.id,
      keeperPath: keeper.path,
      memberIds,
      memberPaths,
      policyVersion: DUPLICATE_POLICY_VERSION,
    });
  }

  return duplicateGroups.sort((left, right) =>
    compareText(left.keeperPath, right.keeperPath),
  );
}

function summarize(files, duplicateGroups) {
  const images = files.filter((file) => file.kind === "image");
  const videos = files.filter((file) => file.kind === "video");
  const redundantImageFiles = duplicateGroups.reduce(
    (total, group) => total + group.memberIds.length - 1,
    0,
  );
  return {
    totalFiles: files.length,
    images: images.length,
    videos: videos.length,
    exactUniqueImages: images.length - redundantImageFiles,
    exactDuplicateGroups: duplicateGroups.length,
    redundantImageFiles,
    lowResolutionImages: images.filter((file) => file.lowResolution === true)
      .length,
    corruptImages: images.filter((file) => file.error !== null).length,
    unreadableVideos: videos.filter((file) => file.error !== null).length,
  };
}

/**
 * @param {{
 *   source: string;
 *   env?: NodeJS.ProcessEnv;
 *   binaries?: {
 *     ffmpeg: { path: string; versionLine: string };
 *     ffprobe: { path: string; versionLine: string };
 *   };
 * }} options
 */
export async function buildInventory({
  source,
  env = process.env,
  binaries,
} = {}) {
  if (!source) {
    throw new Error("Inventory requires --source");
  }
  const absoluteSource = resolve(source);
  const sourceStat = await stat(absoluteSource).catch(() => null);
  if (!sourceStat?.isDirectory()) {
    throw new Error(`Media source is not a directory: ${source}`);
  }

  const resolvedBinaries = binaries ?? (await preflightMediaBinaries({ env }));
  const candidates = await discoverMediaFiles(absoluteSource);
  const files = await mapWithConcurrency(candidates, 8, (candidate) =>
    inspectFile(candidate, absoluteSource, resolvedBinaries, env),
  );
  const duplicateGroups = applyDuplicateGroups(files);

  return {
    artifactType: "source-media-inventory",
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    policies: {
      lowResolutionShortEdgePixels: LOW_RESOLUTION_EDGE,
      duplicateKeeper: DUPLICATE_POLICY_VERSION,
      videoSampleTimes:
        "0.25s,25%,50%,75%,duration-0.25s; clamped and deduplicated",
    },
    toolchain: {
      ffmpeg: resolvedBinaries.ffmpeg.versionLine,
      ffprobe: resolvedBinaries.ffprobe.versionLine,
      sharp: sharp.versions.sharp,
    },
    summary: summarize(files, duplicateGroups),
    duplicateGroups,
    files,
  };
}

export function assertStructuralBaseline(actual, expected) {
  const mismatches = [];
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (actualValue !== expectedValue) {
      mismatches.push(
        `${key}: expected ${expectedValue}, received ${String(actualValue)}`,
      );
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`Structural baseline mismatch:\n${mismatches.join("\n")}`);
  }
}

/**
 * @param {{
 *   source: string;
 *   inventoryPath: string;
 *   enforceBaseline?: boolean;
 *   env?: NodeJS.ProcessEnv;
 * }} options
 */
export async function writeInventory({
  source,
  inventoryPath,
  enforceBaseline = true,
  env = process.env,
} = {}) {
  if (!inventoryPath) {
    throw new Error("Inventory requires --inventory");
  }
  const inventory = await buildInventory({ source, env });
  if (enforceBaseline) {
    assertStructuralBaseline(inventory.summary, APPROVED_SOURCE_BASELINE);
  }
  await mkdir(dirname(resolve(inventoryPath)), { recursive: true });
  await writeFile(resolve(inventoryPath), serialize(inventory));
  return inventory;
}

function decisionsArray(document) {
  if (Array.isArray(document)) return document;
  if (Array.isArray(document?.decisions)) return document.decisions;
  throw new Error("Decisions must be an array or an object with a decisions array");
}

function requireReviewField(decision, field) {
  const value = decision[field];
  const missingString = typeof value === "string" && value.trim() === "";
  const missingObject =
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0;
  if (
    value === undefined ||
    value === null ||
    missingString ||
    missingObject
  ) {
    throw new Error(`Decision ${decision.id} requires ${field}`);
  }
}

function requireReviewObjectFields(decision, field, requiredFields) {
  const value = decision[field];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Decision ${decision.id} requires ${field} review details`);
  }
  for (const requiredField of requiredFields) {
    const nested = value[requiredField];
    if (
      nested === undefined ||
      nested === null ||
      (typeof nested === "string" && nested.trim() === "")
    ) {
      throw new Error(
        `Decision ${decision.id} requires ${field}.${requiredField}`,
      );
    }
  }
}

function approvedValue(value) {
  return value === true || value === "approved" || value === "known";
}

export function validateDecisions(inventory, decisionDocument) {
  const decisions = decisionsArray(decisionDocument);
  const inventoryIds = new Set(inventory.files.map((file) => file.id));
  const decisionIds = new Set();

  for (const decision of decisions) {
    if (!decision || typeof decision !== "object" || !decision.id) {
      throw new Error("Every decision requires an id");
    }
    if (decisionIds.has(decision.id)) {
      throw new Error(`Duplicate decision id: ${decision.id}`);
    }
    decisionIds.add(decision.id);
    if (!inventoryIds.has(decision.id)) {
      throw new Error(`Stale decision id: ${decision.id}`);
    }

    for (const field of [
      "category",
      "placement",
      "quality",
      "rights",
      "relationshipApproval",
      "safetyPrivacy",
      "decorative",
      "status",
      "reason",
    ]) {
      requireReviewField(decision, field);
    }
    requireReviewObjectFields(decision, "quality", [
      "resolution",
      "crop",
      "exposure",
      "blur",
      "orientation",
    ]);
    requireReviewObjectFields(decision, "rights", [
      "ownership",
      "publicationPermission",
      "basis",
    ]);
    requireReviewObjectFields(decision, "relationshipApproval", [
      "identity",
      "currentRelationship",
    ]);
    requireReviewObjectFields(decision, "safetyPrivacy", [
      "ppe",
      "faces",
      "plates",
      "signage",
      "addresses",
      "sensitiveDetails",
      "result",
    ]);
    if (!FINAL_STATUSES.has(decision.status)) {
      throw new Error(`Decision ${decision.id} has invalid status`);
    }
    if (typeof decision.reason !== "string" || !decision.reason.trim()) {
      throw new Error(`Decision ${decision.id} requires a nonempty reason`);
    }

    const file = inventory.files.find((candidate) => candidate.id === decision.id);
    if (!Object.hasOwn(decision, "alt") || typeof decision.alt !== "string") {
      throw new Error(`Decision ${decision.id} requires alt`);
    }
    if (!decision.alt.trim() && decision.decorative !== true) {
      throw new Error(
        `Decision ${decision.id} requires alt text or decorative: true`,
      );
    }
    if (
      decision.status === "publish" &&
      file?.kind === "image" &&
      decision.decorative !== true &&
      (typeof decision.alt !== "string" || !decision.alt.trim())
    ) {
      throw new Error(
        `Published image decision ${decision.id} requires approved alt text or decorative: true`,
      );
    }
    if (decision.decorative === true && decision.alt !== "") {
      throw new Error(
        `Decorative decision ${decision.id} must use an empty alt string`,
      );
    }
    if (
      file?.duplicateGroupId !== null &&
      file?.isKeeper === false &&
      decision.status !== "duplicate"
    ) {
      throw new Error(
        `Redundant exact duplicate ${decision.id} requires duplicate status`,
      );
    }
    if (
      decision.status === "duplicate" &&
      (file?.duplicateGroupId === null || file?.isKeeper !== false)
    ) {
      throw new Error(
        `Decision ${decision.id} cannot use duplicate status without a redundant exact duplicate`,
      );
    }

    if (decision.status === "publish" && decision.category === "logo") {
      if (!approvedValue(decision.relationshipApproval?.identity)) {
        throw new Error(`Published logo ${decision.id} requires known identity`);
      }
      if (
        !approvedValue(
          decision.relationshipApproval?.currentRelationship,
        )
      ) {
        throw new Error(
          `Published logo ${decision.id} requires current relationship approval`,
        );
      }
      if (!approvedValue(decision.rights?.publicationPermission)) {
        throw new Error(
          `Published logo ${decision.id} requires publication permission`,
        );
      }
      if (
        typeof decision.officialLogoPath !== "string" ||
        !decision.officialLogoPath.trim()
      ) {
        throw new Error(
          `Published logo ${decision.id} requires an approved official logo path`,
        );
      }
    }

    if (decision.status === "publish") {
      assertMarketingClaimsSafe(
        {
          alt: decision.alt ?? "",
          caption: decision.caption ?? "",
          displayName: decision.displayName ?? "",
          publicCopy: decision.publicCopy ?? "",
        },
        `media decision ${decision.id} alt and public copy`,
      );
    }
  }

  for (const id of inventoryIds) {
    if (!decisionIds.has(id)) {
      throw new Error(`Missing decision for inventory id: ${id}`);
    }
  }

  return decisions;
}

function buildCompiledManifest(inventory, decisionDocument) {
  const decisions = validateDecisions(inventory, decisionDocument);
  const byId = new Map(decisions.map((decision) => [decision.id, decision]));
  const statusCounts = Object.fromEntries(
    [...FINAL_STATUSES].map((status) => [status, 0]),
  );
  const records = inventory.files.map((file) => {
    const decision = byId.get(file.id);
    statusCounts[decision.status] += 1;
    return {
      ...file,
      decision,
    };
  });

  return {
    artifactType: "compiled-media-manifest",
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    inventorySchemaVersion: inventory.schemaVersion,
    reviewAuthority: "source-media-decisions.json",
    generatedContentIsNotAReviewDecision: true,
    summary: {
      totalRecords: records.length,
      statuses: statusCounts,
    },
    records,
  };
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(resolve(path), "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${error.message}`);
  }
}

export async function compileManifest({
  inventoryPath,
  decisionsPath,
  manifestPath,
} = {}) {
  if (!inventoryPath || !decisionsPath || !manifestPath) {
    throw new Error(
      "Compile requires --inventory, --decisions, and --manifest",
    );
  }
  const inventory = await readJson(inventoryPath, "inventory");
  const decisions = await readJson(decisionsPath, "decisions");
  const manifest = buildCompiledManifest(inventory, decisions);
  await mkdir(dirname(resolve(manifestPath)), { recursive: true });
  await writeFile(resolve(manifestPath), serialize(manifest));
  return manifest;
}

/**
 * @param {{
 *   source: string;
 *   inventoryPath: string;
 *   decisionsPath?: string;
 *   manifestPath?: string;
 *   enforceBaseline?: boolean;
 *   env?: NodeJS.ProcessEnv;
 * }} options
 */
export async function checkAudit({
  source,
  inventoryPath,
  decisionsPath,
  manifestPath,
  enforceBaseline = false,
  env = process.env,
} = {}) {
  if (!source || !inventoryPath) {
    throw new Error("Check requires --source and --inventory");
  }

  const expectedInventory = await buildInventory({ source, env });
  if (enforceBaseline) {
    assertStructuralBaseline(
      expectedInventory.summary,
      APPROVED_SOURCE_BASELINE,
    );
  }
  const inventoryBytes = await readFile(resolve(inventoryPath), "utf8");
  if (inventoryBytes !== serialize(expectedInventory)) {
    throw new Error("Inventory drift detected");
  }

  if (!decisionsPath && !manifestPath) {
    return;
  }
  if (!decisionsPath || !manifestPath) {
    throw new Error(
      "Full check requires both --decisions and --manifest when either is supplied",
    );
  }

  const decisions = await readJson(decisionsPath, "decisions");
  const expectedManifest = buildCompiledManifest(expectedInventory, decisions);
  const manifestBytes = await readFile(resolve(manifestPath), "utf8");
  if (manifestBytes !== serialize(expectedManifest)) {
    throw new Error("Manifest drift detected");
  }
}

function safeSourcePath(source, sourceRelativePath) {
  const absoluteSource = resolve(source);
  const absoluteFile = resolve(absoluteSource, sourceRelativePath);
  if (
    absoluteFile !== absoluteSource &&
    !absoluteFile.startsWith(`${absoluteSource}${sep}`)
  ) {
    throw new Error(`Unsafe inventory path: ${sourceRelativePath}`);
  }
  return absoluteFile;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function labelledThumbnail(input, label) {
  const imageHeight = 180;
  const labelHeight = 40;
  const svg = Buffer.from(
    `<svg width="240" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="${labelHeight}" fill="#111827"/>
      <text x="8" y="17" fill="white" font-size="10" font-family="Arial">${escapeXml(label.slice(0, 42))}</text>
      <text x="8" y="32" fill="#9ca3af" font-size="9" font-family="Arial">${escapeXml(label.slice(42, 84))}</text>
    </svg>`,
  );
  return sharp(input)
    .autoOrient()
    .resize(240, imageHeight, {
      fit: "contain",
      background: "#f3f4f6",
      withoutEnlargement: true,
    })
    .extend({
      top: 0,
      bottom: labelHeight,
      left: 0,
      right: 0,
      background: "#111827",
    })
    .composite([{ input: svg, left: 0, top: imageHeight }])
    .jpeg({ quality: 82 })
    .toBuffer();
}

async function writeContactSheets(thumbnails, outputDirectory, prefix) {
  const columns = 4;
  const rows = 5;
  const perSheet = columns * rows;
  let written = 0;
  await mkdir(outputDirectory, { recursive: true });

  for (let start = 0; start < thumbnails.length; start += perSheet) {
    const batch = thumbnails.slice(start, start + perSheet);
    const rowCount = Math.ceil(batch.length / columns);
    const outputPath = join(
      outputDirectory,
      `${prefix}-${String(written + 1).padStart(3, "0")}.jpg`,
    );
    await sharp({
      create: {
        width: columns * 240,
        height: rowCount * 220,
        channels: 3,
        background: "#d1d5db",
      },
    })
      .composite(
        batch.map((input, index) => ({
          input,
          left: (index % columns) * 240,
          top: Math.floor(index / columns) * 220,
        })),
      )
      .jpeg({ quality: 86 })
      .toFile(outputPath);
    written += 1;
  }
  return written;
}

function reviewSlug(path) {
  return basename(path, extname(path))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "video";
}

function safeFrameSeekTime(file, requestedTime) {
  const [numerator, denominator] = String(file.frameRate ?? "")
    .split("/")
    .map(Number);
  const framesPerSecond =
    Number.isFinite(numerator) &&
    Number.isFinite(denominator) &&
    denominator > 0
      ? numerator / denominator
      : 30;
  const frameDuration = framesPerSecond > 0 ? 1 / framesPerSecond : 1 / 30;
  return Math.min(
    requestedTime,
    Math.max(0, file.durationSeconds - frameDuration),
  );
}

/**
 * @param {{
 *   source: string;
 *   inventoryPath: string;
 *   reviewDir: string;
 *   env?: NodeJS.ProcessEnv;
 * }} options
 */
export async function generateReview({
  source,
  inventoryPath,
  reviewDir,
  env = process.env,
} = {}) {
  if (!source || !inventoryPath || !reviewDir) {
    throw new Error(
      "Review requires --source, --inventory, and --review-dir",
    );
  }
  const absoluteSource = resolve(source);
  const absoluteReviewDir = resolve(reviewDir);
  if (
    absoluteReviewDir === absoluteSource ||
    absoluteReviewDir.startsWith(`${absoluteSource}${sep}`)
  ) {
    throw new Error("Review directory must be outside the source directory");
  }

  const binaries = await preflightMediaBinaries({ env });
  const inventory = await readJson(inventoryPath, "inventory");
  const uniqueImages = inventory.files.filter(
    (file) =>
      file.kind === "image" &&
      (file.duplicateGroupId === null || file.isKeeper === true),
  );
  const imageThumbnails = [];
  let skippedImages = 0;
  for (const file of uniqueImages) {
    if (file.error) {
      skippedImages += 1;
      continue;
    }
    const sourcePath = safeSourcePath(absoluteSource, file.path);
    try {
      imageThumbnails.push(
        await labelledThumbnail(sourcePath, `${file.id} ${file.path}`),
      );
    } catch {
      skippedImages += 1;
    }
  }
  const imageContactSheets = await writeContactSheets(
    imageThumbnails,
    join(absoluteReviewDir, "images"),
    "contact-sheet",
  );

  let videoFrames = 0;
  let videoContactSheets = 0;
  const videos = inventory.files.filter((file) => file.kind === "video");
  for (const file of videos) {
    if (file.error) continue;
    const sourcePath = safeSourcePath(absoluteSource, file.path);
    const videoDirectory = join(
      absoluteReviewDir,
      "videos",
      reviewSlug(file.path),
    );
    await mkdir(videoDirectory, { recursive: true });
    const thumbnails = [];
    for (const [index, time] of file.sampleTimesSeconds.entries()) {
      const seekTime = safeFrameSeekTime(file, time);
      const framePath = join(
        videoDirectory,
        `frame-${String(index + 1).padStart(2, "0")}-${time.toFixed(3)}s.png`,
      );
      await execFileAsync(
        binaries.ffmpeg.path,
        [
          "-loglevel",
          "error",
          "-ss",
          seekTime.toFixed(6),
          "-i",
          sourcePath,
          "-map",
          "0:v:0",
          "-frames:v",
          "1",
          "-y",
          framePath,
        ],
        { env, maxBuffer: 10 * 1024 * 1024 },
      );
      thumbnails.push(
        await labelledThumbnail(
          framePath,
          `${file.id} ${time.toFixed(3)}s`,
        ),
      );
      videoFrames += 1;
    }
    const sheetCount = await writeContactSheets(
      thumbnails,
      videoDirectory,
      "contact-sheet",
    );
    if (sheetCount === 1) {
      const numberedPath = join(videoDirectory, "contact-sheet-001.jpg");
      const singlePath = join(videoDirectory, "contact-sheet.jpg");
      await writeFile(singlePath, await readFile(numberedPath));
    }
    videoContactSheets += sheetCount;
  }

  const report = {
    artifactType: "media-review-generation-report",
    inventory: basename(inventoryPath),
    uniqueImages: uniqueImages.length,
    renderedImages: imageThumbnails.length,
    skippedImages,
    imageContactSheets,
    videos: videos.length,
    videoFrames,
    videoContactSheets,
  };
  await writeFile(
    join(absoluteReviewDir, "review-report.json"),
    serialize(report),
  );
  return report;
}

function parseArgs(args) {
  const [command, ...rest] = args;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    if (key === "skip-baseline") {
      options.skipBaseline = true;
      continue;
    }
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[
      key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    ] = value;
    index += 1;
  }
  return { command, options };
}

export async function main(args = process.argv.slice(2)) {
  const { command, options } = parseArgs(args);
  if (command === "inventory") {
    await writeInventory({
      source: options.source,
      inventoryPath: options.inventory,
      enforceBaseline: !options.skipBaseline,
    });
    return;
  }
  if (command === "compile") {
    await compileManifest({
      inventoryPath: options.inventory,
      decisionsPath: options.decisions,
      manifestPath: options.manifest,
    });
    return;
  }
  if (command === "check") {
    await checkAudit({
      source: options.source,
      inventoryPath: options.inventory,
      decisionsPath: options.decisions,
      manifestPath: options.manifest,
      enforceBaseline: !options.skipBaseline,
    });
    return;
  }
  if (command === "review") {
    await generateReview({
      source: options.source,
      inventoryPath: options.inventory,
      reviewDir: options.reviewDir,
    });
    return;
  }
  throw new Error(
    "Usage: audit-sfi-media.mjs <inventory|compile|check|review> [options]",
  );
}

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
