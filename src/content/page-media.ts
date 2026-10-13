import type { ServiceRouteSlug } from "@/content/services";
import plan from "../../assets/page-media.json";

type PlanItem = (typeof plan.items)[number] & {
  widths?: number[];
  start?: number;
};

/** Owner blanket approval for the supplied Drive folder (2026-10-13). */
export const ownerMediaApproval = plan.approval;
export const pageMediaPlan: readonly PlanItem[] = plan.items;

function planItem(id: string): PlanItem {
  const item = plan.items.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown page media id: ${id}`);
  return item;
}

export function planImage(id: string): ResponsiveImage {
  const item = planItem(id) as PlanItem & { widths: number[] };
  return {
    manifestId: item.manifestId as `media-${string}`,
    sourcePath: item.source,
    alt: item.alt,
    base: `/media/${item.out}`,
    widths: item.widths,
    width: item.width,
    height: item.height,
  };
}

export function planVideo(id: string): ServiceVideo {
  const item = planItem(id);
  return {
    manifestId: item.manifestId as `media-${string}`,
    sourcePath: item.source,
    alt: item.alt,
    src: `/media/${item.out}.mp4`,
    poster: `/media/${item.out}-poster.jpg`,
    width: item.width,
    height: item.height,
  };
}

/**
 * Approved (publish) source-media records rendered on interior pages. Each
 * entry cites its manifest id and must reuse the manifest's reviewed alt text;
 * `page-media.test.ts` enforces both. Derivatives are produced by
 * `scripts/build-page-media.mjs` into `assets/` and synced to `/media`.
 */
export type ResponsiveImage = {
  manifestId: `media-${string}`;
  sourcePath: string;
  alt: string;
  /** Public path without the `-{width}.{ext}` suffix. */
  base: `/media/${string}`;
  widths: readonly number[];
  width: number;
  height: number;
};

export type ServiceVideo = {
  manifestId: `media-${string}`;
  sourcePath: string;
  alt: string;
  src: `/media/${string}.mp4`;
  poster: `/media/${string}.jpg`;
  width: number;
  height: number;
};

export type ServiceMedia = {
  images: readonly ResponsiveImage[];
  videos: readonly ServiceVideo[];
};

const landscape = { widths: [960, 1600], width: 1600 } as const;
const portrait = { widths: [720, 1200], width: 1200, height: 1600 } as const;

export const processImage: ResponsiveImage = planImage("process-spray");

export const serviceMedia: Partial<Record<ServiceRouteSlug, ServiceMedia>> = {
  "spray-foam-insulation": {
    images: [
      {
        manifestId: "media-22bb94b23a8c723c",
        sourcePath: "SFI- IMAGES/IMG_9636.jpeg",
        alt: "Technician applying spray foam around an interior window opening",
        base: "/media/services/IMG_9636",
        ...landscape,
        height: 1200,
      },
      {
        manifestId: "media-4cbf4080d9384adf",
        sourcePath: "SFI- IMAGES/IMG_9678.jpeg",
        alt: "Technician applying spray foam insulation above an interior window",
        base: "/media/services/IMG_9678",
        ...portrait,
      },
      planImage("spray-interior"),
    ],
    videos: [
      planVideo("sf-spray-foam-roofline"),
      {
        manifestId: "media-d9f2d31ee3d5e4eb",
        sourcePath: "SFI- IMAGES/2688129a-064d-4092-93a9-224d9407d1b3.mp4",
        alt: "Technician applying spray foam insulation inside a framed wall",
        src: "/media/services/sf-spray-foam-framed-wall.mp4",
        poster: "/media/services/sf-spray-foam-framed-wall-poster.jpg",
        width: 352,
        height: 640,
      },
      {
        manifestId: "media-7f1295ba7ac5fbb1",
        sourcePath: "SFI- IMAGES/71ccc8f7-bbe3-44ca-8417-55d8492f470b.mp4",
        alt: "Technician applying spray foam insulation overhead",
        src: "/media/services/sf-spray-foam-overhead.mp4",
        poster: "/media/services/sf-spray-foam-overhead-poster.jpg",
        width: 352,
        height: 640,
      },
    ],
  },
  "air-vapour-barriers": {
    images: [
      {
        manifestId: "media-3e067c7811a81159",
        sourcePath: "SFI- IMAGES/IMG_7996 2.jpeg",
        alt: "Crew installing an exterior air and vapour barrier from an elevated work platform",
        base: "/media/services/IMG_7996-2",
        ...landscape,
        height: 1200,
      },
      {
        manifestId: "media-a6dbc55c9f3bccb1",
        sourcePath: "SFI- IMAGES/IMG_7881.jpeg",
        alt: "Exterior insulation installed across a commercial wall assembly",
        base: "/media/services/IMG_7881",
        ...landscape,
        height: 778,
      },
      {
        manifestId: "media-caa93e11e3329eeb",
        sourcePath: "SFI- IMAGES/IMG_9642.jpeg",
        alt: "Technician applying an exterior air and vapour barrier around a window",
        base: "/media/services/IMG_9642",
        ...portrait,
      },
      planImage("barrier-lift"),
      planImage("barrier-membrane-walls"),
    ],
    videos: [planVideo("sf-barrier-install")],
  },
  "fire-protection": {
    images: [planImage("fire-steel-deck")],
    videos: [planVideo("sf-fireproofing-overhead")],
  },
  "spf-roofing": {
    images: [
      planImage("roof-spray"),
      planImage("roof-deck"),
    ],
    videos: [],
  },
};

/** One distinct image per homepage capability-rail panel. */
export const railImages: Record<ServiceRouteSlug, ResponsiveImage> = {
  "spray-foam-insulation": planImage("rail-spray-foam"),
  "fire-protection": planImage("rail-fire-protection"),
  "air-vapour-barriers": planImage("rail-air-vapour"),
  "spf-roofing": planImage("rail-spf-roofing"),
};

/** One page-topic hero per interior page (image or 12 s muted loop). */
export const heroMedia = {
  services: planVideo("hero-services"),
  "spray-foam-insulation": planVideo("hero-spray-foam"),
  "fire-protection": planImage("hero-fire-protection"),
  "air-vapour-barriers": planImage("hero-air-vapour"),
  "spf-roofing": planImage("hero-spf-roofing"),
  projects: planImage("hero-projects"),
  partners: planImage("hero-partners"),
  about: planImage("hero-about"),
  locations: planImage("hero-locations"),
  contact: planImage("hero-contact"),
  "request-estimate": planImage("hero-request-estimate"),
} as const;

export const aboutImages: readonly ResponsiveImage[] = [
  planImage("about-truck"),
  planImage("about-site-banner"),
  planImage("about-fleet-tower"),
  planImage("about-fleet"),
];

export const brandLockups = {
  strongFoam: { src: "/media/brand/strongfoam-logo.svg", width: 252, height: 52 },
  strongFire: { src: "/media/brand/strongfire-logo.svg", width: 772, height: 240 },
  strongFireOnDark: { src: "/media/brand/strongfire-logo-on-dark.svg", width: 772, height: 240 },
} as const;
