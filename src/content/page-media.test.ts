import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../assets/source-media-manifest.json";
import { brandLockups, processImage, serviceMedia } from "@/content/page-media";

type Rec = { id: string; path: string; decision: { status: string; alt: string } };
const publish = new Map(
  (manifest.records as Rec[])
    .filter((r) => r.decision.status === "publish")
    .map((r) => [r.id, r]),
);
const asset = (p: string) => join(process.cwd(), "assets", p.replace(/^\/media\//, ""));

const all = [
  processImage,
  ...Object.values(serviceMedia).flatMap((m) => [...(m?.images ?? []), ...(m?.videos ?? [])]),
];

describe("page media", () => {
  it("cites publish manifest records with their reviewed alt text", () => {
    for (const item of all) {
      const rec = publish.get(item.manifestId);
      expect(rec, item.manifestId).toBeDefined();
      expect(rec?.path).toBe(item.sourcePath);
      expect(rec?.decision.alt).toBe(item.alt);
    }
  });

  it("ships every derivative file", () => {
    for (const item of all) {
      if ("base" in item) {
        for (const w of item.widths)
          for (const ext of ["webp", "avif"])
            expect(existsSync(asset(`${item.base}-${w}.${ext}`)), `${item.base}-${w}.${ext}`).toBe(true);
      } else {
        expect(existsSync(asset(item.src))).toBe(true);
        expect(existsSync(asset(item.poster))).toBe(true);
      }
    }
    for (const lockup of Object.values(brandLockups)) expect(existsSync(asset(lockup.src))).toBe(true);
  });

  it("puts the portrait spray foam videos on the spray foam page only", () => {
    expect(serviceMedia["spray-foam-insulation"]?.videos).toHaveLength(2);
    expect(serviceMedia["air-vapour-barriers"]?.videos).toHaveLength(0);
    expect(serviceMedia["fire-protection"]).toBeUndefined();
  });
});
