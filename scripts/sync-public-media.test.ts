import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_STATIC_MEDIA,
  syncPublicMedia,
} from "./sync-public-media.mjs";

describe("syncPublicMedia", () => {
  it("allowlists only approved first-party static brand media", () => {
    expect(PUBLIC_STATIC_MEDIA).toEqual([
      "brand/SFI-Logo-Jpeg-EDIT.jpg",
      "brand/SFI-Logo-Jpeg-EDIT_00-removebg-preview.png",
    ]);
  });

  it("publishes only allowlisted static media and approved derivatives", async () => {
    const root = await mkdtemp(join(tmpdir(), "sf-media-"));
    const destRoot = join(root, "public", "media");
    const manifestPath = join(root, "assets", "source-media-manifest.json");
    const derivativeAsset = "projects/generated/approved-960.webp";
    const derivativePublic = "projects/approved-960.webp";

    for (const relativePath of PUBLIC_STATIC_MEDIA) {
      const path = join(root, "assets", relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, relativePath);
    }
    await mkdir(dirname(join(root, "assets", derivativeAsset)), {
      recursive: true,
    });
    await writeFile(join(root, "assets", derivativeAsset), "approved");
    await writeFile(
      join(root, "assets", "projects", "held.jpg"),
      "must not publish",
    );
    await mkdir(destRoot, { recursive: true });
    await writeFile(join(destRoot, "stale.jpg"), "stale");
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        records: [
          {
            decision: { status: "publish" },
            derivatives: [
              {
                assetPath: derivativeAsset,
                publicDestination: derivativePublic,
              },
            ],
          },
          {
            decision: { status: "hold" },
            derivatives: [
              {
                assetPath: "projects/held.jpg",
                publicDestination: "projects/held.jpg",
              },
            ],
          },
        ],
      })}\n`,
    );

    await syncPublicMedia({ root, manifestPath });

    expect(await readFile(join(destRoot, derivativePublic), "utf8")).toBe(
      "approved",
    );
    for (const relativePath of PUBLIC_STATIC_MEDIA) {
      expect(await readFile(join(destRoot, relativePath), "utf8")).toBe(
        relativePath,
      );
    }
    await expect(stat(join(destRoot, "projects", "held.jpg"))).rejects
      .toMatchObject({ code: "ENOENT" });
    await expect(stat(join(destRoot, "stale.jpg"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("replaces a self-referential media symlink with a real directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "sf-media-link-"));
    const destRoot = join(root, "public", "media");
    const manifestPath = join(root, "assets", "source-media-manifest.json");

    for (const relativePath of PUBLIC_STATIC_MEDIA) {
      const path = join(root, "assets", relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, relativePath);
    }
    await writeFile(manifestPath, '{"records":[]}\n');
    await mkdir(join(root, "public"), { recursive: true });
    await symlink("../../assets", destRoot);

    expect((await lstat(destRoot)).isSymbolicLink()).toBe(true);
    await syncPublicMedia({ root, manifestPath });

    const destStat = await lstat(destRoot);
    expect(destStat.isSymbolicLink()).toBe(false);
    expect(destStat.isDirectory()).toBe(true);
  });
});
