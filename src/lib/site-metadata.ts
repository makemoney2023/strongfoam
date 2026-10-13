import type { Metadata } from "next";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { site, socialShareImage } from "@/content/site";

type MarketingMetadataInput = {
  path: "/" | `/${string}`;
  title: string;
  description: string;
};

export function marketingMetadata({
  path,
  title,
  description,
}: MarketingMetadataInput): Metadata {
  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: site.brand,
      locale: "en_CA",
      type: "website",
      images: [
        {
          url: socialShareImage.publicPath,
          width: socialShareImage.width,
          height: socialShareImage.height,
          alt: socialShareImage.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialShareImage.publicPath],
    },
  };

  assertMarketingClaimsSafe(metadata, `metadata ${path}`);
  return metadata;
}
