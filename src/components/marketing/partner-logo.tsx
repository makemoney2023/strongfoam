import logoMeta from "../../../assets/partners/logos.json";
import type { PartnerRecord } from "@/content/partner-publication";

type LogoMeta = { width: number; height: number };
const meta = logoMeta as Record<string, LogoMeta>;

/** Target visual area (px²) and caps for equal optical weight across marks. */
const AREA = 7200;
const MAX_H = 60;
const MAX_W = 176;

export function opticalSize(slug: string) {
  const m = meta[slug];
  const ratio = m ? m.width / m.height : 3;
  let h = Math.min(MAX_H, Math.sqrt(AREA / ratio));
  let w = h * ratio;
  if (w > MAX_W) {
    w = MAX_W;
    h = w / ratio;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

export function logoSlug(path: string) {
  return path.replace(/^.*\//, "").replace(/\.webp$/, "");
}

/**
 * Reversed (white) mark for the site's dark surfaces, per the brand logo
 * usage rules. Sized by aspect ratio so wide and stacked marks carry equal
 * visual weight. Plain <img> keeps intrinsic sizing exact (no lazy blanks).
 */
export function PartnerLogo({
  partner,
  decorative = false,
}: {
  partner: PartnerRecord;
  decorative?: boolean;
}) {
  const path = partner.logo.approvedOfficialPath;
  if (!path) return null;
  const slug = logoSlug(path);
  const { width, height } = opticalSize(slug);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={path.replace(/\.webp$/, "-mono.webp")}
      alt={decorative ? "" : partner.logo.alt}
      width={width}
      height={height}
      decoding="async"
      className="partner-logo"
      style={{ ["--logo-w" as string]: `${width}px`, ["--logo-h" as string]: `${height}px` }}
    />
  );
}
