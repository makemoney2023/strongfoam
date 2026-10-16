import type { Metadata } from "next";
import { site } from "@/content/site";

export const OG_IMAGE = `${site.url}/og-image.png?v=2`;

function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  return path === "/" ? site.url : `${site.url}${path}`;
}

/**
 * Per-page metadata: self-referencing og:url / twitter, brand OG image, and
 * no doubled brand suffix (titles that already name the brand are absolute).
 */
export function pageMetadata(m: Metadata): Metadata {
  const canonical = typeof m.alternates?.canonical === "string" ? m.alternates.canonical : "/";
  const url = absoluteUrl(canonical);
  let title = m.title;
  if (typeof title === "string" && title.includes(site.brand)) title = { absolute: title };
  const socialTitle =
    typeof title === "string"
      ? `${title} · ${site.brand}`
      : title && typeof title === "object" && "absolute" in title
        ? String(title.absolute)
        : site.brand;
  const description = typeof m.description === "string" ? m.description : undefined;
  return {
    ...m,
    title,
    openGraph: {
      type: "website",
      locale: "en_CA",
      siteName: site.brand,
      title: socialTitle,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: site.brand }],
      ...m.openGraph,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [OG_IMAGE],
      ...m.twitter,
    },
  };
}
