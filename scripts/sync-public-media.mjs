import { cp, lstat, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const MEDIA_FOLDERS = [
  "animated",
  "backgrounds",
  "brand",
  "projects",
];

/**
 * @param {{ root?: string, folders?: string[] }} [options]
 */
export async function syncPublicMedia({
  root,
  folders = MEDIA_FOLDERS,
} = {}) {
  const projectRoot = root ?? join(dirname(fileURLToPath(import.meta.url)), "..");

  for (const folder of folders) {
    const from = join(projectRoot, "assets", folder);
    const to = join(projectRoot, "public", "media", folder);

    await mkdir(dirname(to), { recursive: true });
    await rm(to, { recursive: true, force: true });
    await cp(from, to, { recursive: true, dereference: true });

    const dest = await lstat(to);
    if (dest.isSymbolicLink()) {
      throw new Error(`${to} is still a symlink after sync`);
    }
  }
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  await syncPublicMedia();
}
