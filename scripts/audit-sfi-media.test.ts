import { execFile } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  APPROVED_SOURCE_BASELINE,
  assertStructuralBaseline,
  buildInventory,
  calculateVideoSampleTimes,
  checkAudit,
  compileManifest,
  generateReview,
  validateDecisions,
  writeInventory,
} from "./audit-sfi-media.mjs";

const exec = promisify(execFile);
const cli = join(import.meta.dirname, "audit-sfi-media.mjs");
type Inventory = Awaited<ReturnType<typeof buildInventory>>;
type MediaFile = Inventory["files"][number];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "sfi-media-audit-"));
  const source = join(root, "Absolute Source");
  const inventoryPath = join(root, "audit", "inventory.json");
  await mkdir(join(source, "Nested"), { recursive: true });

  const landscape = join(source, "Nested", "Space Name.JPG");
  await sharp({
    create: {
      width: 1000,
      height: 800,
      channels: 3,
      background: "#009ee2",
    },
  })
    .jpeg()
    .toFile(landscape);
  await copyFile(landscape, join(source, "duplicate.jpeg"));
  await sharp({
    create: {
      width: 800,
      height: 1000,
      channels: 3,
      background: "#e8043d",
    },
  })
    .png()
    .toFile(join(source, "portrait.PNG"));
  await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: "white",
    },
  })
    .webp()
    .toFile(join(source, "square.WEBP"));
  await writeFile(join(source, "broken.jpg"), "broken");
  await writeFile(join(source, "ignored.docx"), "ignored");

  const unrotated = join(root, "unrotated.mp4");
  await exec("ffmpeg", [
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=blue:s=320x180:d=0.1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-y",
    unrotated,
  ]);
  await exec("ffmpeg", [
    "-loglevel",
    "error",
    "-display_rotation:v:0",
    "90",
    "-i",
    unrotated,
    "-c",
    "copy",
    "-y",
    join(source, "sample clip.MOV"),
  ]);
  return { root, source, inventoryPath };
}

function decision(file: MediaFile, overrides: Record<string, unknown> = {}) {
  return {
    id: file.id,
    category: "project",
    placement: "gallery",
    quality: {
      resolution: "approved",
      crop: "approved",
      exposure: "approved",
      blur: "approved",
      orientation: "approved",
    },
    rights: {
      ownership: "approved",
      publicationPermission: "approved",
      basis: "Fixture approval.",
    },
    relationshipApproval: {
      identity: "not-applicable",
      currentRelationship: "not-applicable",
    },
    safetyPrivacy: {
      ppe: "not-applicable",
      faces: "none",
      plates: "none",
      signage: "none",
      addresses: "none",
      sensitiveDetails: "none",
      result: "approved",
    },
    alt: `Approved view of ${file.path}`,
    decorative: false,
    status:
      file.duplicateGroupId !== null && !file.isKeeper
        ? "duplicate"
        : "publish",
    reason: "Fixture approval.",
    ...overrides,
  };
}

async function snapshot(paths: string[]) {
  return Promise.all(
    paths.map(async (path) => {
      const info = await stat(path);
      return { path, bytes: await readFile(path), mtimeMs: info.mtimeMs };
    }),
  );
}

describe("audit-sfi-media inventory", () => {
  it("stores deterministic relative metadata, errors, duplicates, and sample policy", async () => {
    const { source } = await fixture();
    const inventory = await buildInventory({ source });

    expect(await buildInventory({ source })).toEqual(inventory);
    expect(JSON.stringify(inventory)).not.toContain(source);
    expect(inventory.files.map((file) => file.path)).toEqual([
      "broken.jpg",
      "duplicate.jpeg",
      "Nested/Space Name.JPG",
      "portrait.PNG",
      "sample clip.MOV",
      "square.WEBP",
    ]);
    expect(inventory.files.every((file) => /^media-[a-f0-9]{16}$/.test(file.id)))
      .toBe(true);
    expect(inventory.files.find((file) => file.path.endsWith("Space Name.JPG")))
      .toMatchObject({
        width: 1000,
        height: 800,
        orientation: "landscape",
        lowResolution: false,
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    expect(inventory.files.find((file) => file.path === "portrait.PNG"))
      .toMatchObject({ orientation: "portrait" });
    expect(inventory.files.find((file) => file.path === "square.WEBP"))
      .toMatchObject({ orientation: "square", lowResolution: true });
    expect(inventory.files.find((file) => file.path === "broken.jpg")?.error)
      .toMatch(/image metadata/i);
    expect(inventory.files.some((file) => file.path.endsWith(".docx"))).toBe(false);
    expect(inventory.files.find((file) => file.kind === "video")).toMatchObject({
      width: 180,
      height: 320,
      orientation: "portrait",
      rotationDegrees: 90,
      codec: "h264",
      sampleTimesSeconds: expect.any(Array),
    });
    expect(inventory.duplicateGroups[0]).toMatchObject({
      keeperPath: "duplicate.jpeg",
      memberPaths: ["duplicate.jpeg", "Nested/Space Name.JPG"],
    });
    expect(inventory.summary).toMatchObject({
      totalFiles: 6,
      images: 5,
      videos: 1,
      exactDuplicateGroups: 1,
      redundantImageFiles: 1,
      lowResolutionImages: 1,
      corruptImages: 1,
    });
    expect(calculateVideoSampleTimes(10)).toEqual([0.25, 2.5, 5, 7.5, 9.75]);
    expect(calculateVideoSampleTimes(0.5)).toEqual([0.125, 0.25, 0.375]);
  }, 30_000);

  it("locks the approved baseline and writes byte-stable inventory", async () => {
    expect(APPROVED_SOURCE_BASELINE).toEqual({
      totalFiles: 576,
      images: 544,
      videos: 32,
      exactUniqueImages: 484,
      exactDuplicateGroups: 47,
      redundantImageFiles: 60,
      lowResolutionImages: 34,
      corruptImages: 0,
    });
    expect(() =>
      assertStructuralBaseline(
        { ...APPROVED_SOURCE_BASELINE, lowResolutionImages: 35 },
        APPROVED_SOURCE_BASELINE,
      ),
    ).toThrow(/lowResolutionImages.*expected 34.*received 35/i);

    const { source, inventoryPath } = await fixture();
    await writeInventory({ source, inventoryPath, enforceBaseline: false });
    const before = await readFile(inventoryPath);
    await writeInventory({ source, inventoryPath, enforceBaseline: false });
    expect(await readFile(inventoryPath)).toEqual(before);
  });

  it.each(["ffmpeg", "ffprobe"])(
    "fails missing %s preflight before output",
    async (missing) => {
      const { root, source, inventoryPath } = await fixture();
      const path = join(root, "bin");
      await mkdir(path);
      const available = missing === "ffmpeg" ? "ffprobe" : "ffmpeg";
      const fake = join(path, available);
      await writeFile(fake, `#!/bin/sh\necho '${available} version fixture'\n`);
      await chmod(fake, 0o755);

      await expect(
        exec(
          process.execPath,
          [
            "--experimental-strip-types",
            cli,
            "inventory",
            "--source",
            source,
            "--inventory",
            inventoryPath,
            "--skip-baseline",
          ],
          { env: { ...process.env, PATH: path } },
        ),
      ).rejects.toMatchObject({
        stderr: expect.stringMatching(
          new RegExp(`Missing required binary: ${missing}`),
        ),
      });
      await expect(stat(inventoryPath)).rejects.toMatchObject({ code: "ENOENT" });
    },
  );
});

describe("audit-sfi-media decisions and compilation", () => {
  it("strictly validates decisions and public claims", async () => {
    const { source } = await fixture();
    const inventory = await buildInventory({ source });
    const decisions = inventory.files.map((file) => decision(file));
    const replaceFirst = (replacement: Record<string, unknown>) => [
      { ...decisions[0], ...replacement },
      ...decisions.slice(1),
    ];

    expect(() => validateDecisions(inventory, decisions)).not.toThrow();
    expect(() => validateDecisions(inventory, decisions.slice(1)))
      .toThrow(/missing decision/i);
    expect(() =>
      validateDecisions(inventory, [
        { ...decisions[0], alt: undefined },
        ...decisions.slice(1),
      ]),
    ).toThrow(/requires alt/i);
    expect(() =>
      validateDecisions(inventory, [
        ...decisions,
        { ...decisions[0], id: "media-stale000000000" },
      ]),
    ).toThrow(/stale decision/i);
    const redundantIndex = inventory.files.findIndex(
      (file) => file.duplicateGroupId !== null && !file.isKeeper,
    );
    expect(() =>
      validateDecisions(inventory, decisions.map((entry, index) =>
        index === redundantIndex ? { ...entry, status: "publish" } : entry,
      )),
    ).toThrow(/redundant exact duplicate.*duplicate status/i);
    expect(() => validateDecisions(inventory, replaceFirst({ alt: undefined })))
      .toThrow(/requires alt/i);
    expect(() =>
      validateDecisions(
        inventory,
        replaceFirst({
          category: "logo",
          relationshipApproval: {
            identity: "unknown",
            currentRelationship: "approved",
          },
          officialLogoPath: "",
        }),
      ),
    ).toThrow(/logo.*identity/i);
    expect(() =>
      validateDecisions(
        inventory,
        replaceFirst({ alt: "The best installation." }),
      ),
    ).toThrow(/media decision.*alt/i);
    expect(() =>
      validateDecisions(
        inventory,
        replaceFirst({ quality: { resolution: "approved" } }),
      ),
    ).toThrow(/quality\.crop/i);
    expect(() =>
      validateDecisions(
        inventory,
        replaceFirst({
          safetyPrivacy: { result: "approved" },
        }),
      ),
    ).toThrow(/safetyPrivacy\.ppe/i);
  });

  it("compiles fixtures and checks drift without mutating artifacts", async () => {
    const { root, source, inventoryPath } = await fixture();
    await writeInventory({ source, inventoryPath, enforceBaseline: false });
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8")) as Inventory;
    const decisionsPath = join(root, "audit", "decisions.json");
    const manifestPath = join(root, "audit", "manifest.json");
    const reportPath = join(root, "audit", "report.md");
    await mkdir(dirname(decisionsPath), { recursive: true });
    await writeFile(
      decisionsPath,
      `${JSON.stringify(
        { decisions: inventory.files.map((file) => decision(file)) },
        null,
        2,
      )}\n`,
    );
    await writeFile(reportPath, "# Human review report\n");
    const inputsBefore = await snapshot([inventoryPath, decisionsPath]);
    const compiled = await compileManifest({
      inventoryPath,
      decisionsPath,
      manifestPath,
    });
    const manifestBefore = await readFile(manifestPath);
    expect(
      await compileManifest({ inventoryPath, decisionsPath, manifestPath }),
    ).toEqual(compiled);
    expect(await readFile(manifestPath)).toEqual(manifestBefore);
    expect(compiled).toMatchObject({
      artifactType: "compiled-media-manifest",
      reviewAuthority: "source-media-decisions.json",
    });
    expect(await snapshot([inventoryPath, decisionsPath])).toEqual(inputsBefore);

    const allPaths = [
      inventoryPath,
      decisionsPath,
      manifestPath,
      reportPath,
    ];
    const beforeCheck = await snapshot(allPaths);
    await checkAudit({ source, inventoryPath, decisionsPath, manifestPath });
    expect(await snapshot(allPaths)).toEqual(beforeCheck);
    const drift = JSON.parse(await readFile(manifestPath, "utf8"));
    drift.artifactType = "drift";
    await writeFile(manifestPath, `${JSON.stringify(drift, null, 2)}\n`);
    const beforeFailedCheck = await snapshot(allPaths);
    await expect(
      checkAudit({ source, inventoryPath, decisionsPath, manifestPath }),
    ).rejects.toThrow(/manifest drift/i);
    expect(await snapshot(allPaths)).toEqual(beforeFailedCheck);
  });
});

describe("audit-sfi-media review generation", () => {
  it("renders contact sheets and all short-video samples without source writes", async () => {
    const { root, source, inventoryPath } = await fixture();
    const reviewDir = join(root, "review");
    await writeInventory({ source, inventoryPath, enforceBaseline: false });
    const sourcePaths = [
      join(source, "Nested", "Space Name.JPG"),
      join(source, "sample clip.MOV"),
    ];
    const sourceBefore = await snapshot(sourcePaths);
    const report = await generateReview({ source, inventoryPath, reviewDir });

    expect(report).toMatchObject({
      uniqueImages: 4,
      videoFrames: 5,
      videoContactSheets: 1,
    });
    expect(report.imageContactSheets).toBeGreaterThan(0);
    await expect(stat(join(reviewDir, "images", "contact-sheet-001.jpg")))
      .resolves.toMatchObject({});
    await expect(
      stat(join(reviewDir, "videos", "sample-clip", "contact-sheet.jpg")),
    ).resolves.toMatchObject({});
    expect(await snapshot(sourcePaths)).toEqual(sourceBefore);
  }, 30_000);
});
