import { lstat, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MEDIA_FOLDERS, syncPublicMedia } from "./sync-public-media.mjs";

describe("syncPublicMedia", () => {
  it("lists the folders Next serves under /media", () => {
    expect(MEDIA_FOLDERS).toEqual([
      "animated",
      "backgrounds",
      "brand",
      "projects",
    ]);
  });

  it("replaces a self-referential symlink with a real copied directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "sf-media-"));
    const sourceDir = join(root, "assets", "animated");
    const destDir = join(root, "public", "media", "animated");

    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, "loop.mp4"), "omni-loop");
    await mkdir(join(root, "public", "media"), { recursive: true });
    await symlink("../../assets/animated", destDir);

    expect((await lstat(destDir)).isSymbolicLink()).toBe(true);

    await syncPublicMedia({ root, folders: ["animated"] });

    const destStat = await lstat(destDir);
    expect(destStat.isSymbolicLink()).toBe(false);
    expect(destStat.isDirectory()).toBe(true);
    expect(await readFile(join(destDir, "loop.mp4"), "utf8")).toBe("omni-loop");
  });
});
