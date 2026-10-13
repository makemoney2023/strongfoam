import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  rm,
} from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const PUBLIC_STATIC_MEDIA = [
  "brand/SFI-Logo-Jpeg-EDIT.jpg",
  "brand/SFI-Logo-Jpeg-EDIT_00-removebg-preview.png",
];

function safeChild(root, relativePath) {
  const absoluteRoot = resolve(root);
  const child = resolve(absoluteRoot, relativePath);
  if (child === absoluteRoot || !child.startsWith(`${absoluteRoot}${sep}`)) {
    throw new Error(`Unsafe public media path: ${relativePath}`);
  }
  return child;
}

/**
 * @param {{ root?: string, manifestPath?: string }} [options]
 */
export async function syncPublicMedia({
  root,
  manifestPath,
} = {}) {
  const projectRoot = root ?? join(dirname(fileURLToPath(import.meta.url)), "..");
  const assetsRoot = join(projectRoot, "assets");
  const publicRoot = join(projectRoot, "public", "media");
  const resolvedManifest =
    manifestPath ?? join(assetsRoot, "source-media-manifest.json");
  const manifest = JSON.parse(await readFile(resolvedManifest, "utf8"));
  const approvedDerivatives = manifest.records
    .filter((record) => record.decision?.status === "publish")
    .flatMap((record) => record.derivatives ?? []);
  const publications = [
    ...PUBLIC_STATIC_MEDIA.map((relativePath) => ({
      assetPath: relativePath,
      publicDestination: relativePath,
    })),
    ...approvedDerivatives,
  ];

  await rm(publicRoot, { recursive: true, force: true });
  await mkdir(publicRoot, { recursive: true });

  for (const publication of publications) {
    const from = safeChild(assetsRoot, publication.assetPath);
    const to = safeChild(publicRoot, publication.publicDestination);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    const destination = await lstat(to);
    if (destination.isSymbolicLink()) {
      throw new Error(`${to} is still a symlink after sync`);
    }
  }
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  await syncPublicMedia();
}
