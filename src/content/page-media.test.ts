import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../assets/source-media-manifest.json";
import {
  aboutImages,
  brandLockups,
  heroMedia,
  ownerMediaApproval,
  pageMediaPlan,
  processImage,
  railImages,
  serviceMedia,
} from "@/content/page-media";

type Rec = { id: string; path: string; decision: { status: string; alt: string } };
const publish = new Map(
  (manifest.records as Rec[])
    .filter((r) => r.decision.status === "publish")
    .map((r) => [r.id, r]),
);
const asset = (p: string) => join(process.cwd(), "assets", p.replace(/^\/media\//, ""));

const all = [
  processImage,
  ...Object.values(railImages),
  ...aboutImages,
  ...Object.values(heroMedia),
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

  it("gives every service page its own field media", () => {
    expect(serviceMedia["spray-foam-insulation"]?.videos).toHaveLength(3);
    expect(serviceMedia["air-vapour-barriers"]?.videos).toHaveLength(1);
    expect(serviceMedia["fire-protection"]?.videos).toHaveLength(1);
    expect(serviceMedia["spf-roofing"]?.images.length).toBeGreaterThan(0);
  });

  it("never repeats a source file across prominent placements", () => {
    const prominent = [
      processImage,
      ...Object.values(railImages),
      ...aboutImages,
  ...Object.values(heroMedia),
      ...Object.values(serviceMedia).flatMap((m) => [...(m?.images ?? []), ...(m?.videos ?? [])]),
    ]
      // A rail panel may tease its own service page with a still from that
      // page's video (different medium, different page).
      .filter((item) => !(item === railImages["fire-protection"] && item.sourcePath === serviceMedia["fire-protection"]?.videos[0]?.sourcePath))
      .map((item) => item.sourcePath);
    expect(new Set(prominent).size).toBe(prominent.length);
  });

  it("records the owner blanket approval for the Drive folder", () => {
    expect(ownerMediaApproval).toMatchObject({ by: "owner", date: "2026-10-13" });
  });

  it("keeps every video derivative under 5 MB", () => {
    for (const item of pageMediaPlan.filter((entry) => entry.kind === "video")) {
      expect(statSync(asset(`/media/${item.out}.mp4`)).size).toBeLessThan(5 * 1024 * 1024);
    }
  });
});
