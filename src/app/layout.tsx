import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, Source_Sans_3 } from "next/font/google";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { site, socialShareImage } from "@/content/site";
import "./globals.css";

const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.brand} — commercial spray foam & fire protection Ontario`,
    template: `%s · ${site.brand}`,
  },
  description:
    "ICI and multi-unit specialty trades: spray foam insulation, cementitious fireproofing, intumescent coatings, AVB membranes, and SPF roofing across Ontario.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.brand} — commercial spray foam & fire protection Ontario`,
    description:
      "ICI and multi-unit specialty trades: spray foam insulation, cementitious fireproofing, intumescent coatings, AVB membranes, and SPF roofing across Ontario.",
    url: "/",
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
    title: `${site.brand} — commercial spray foam & fire protection Ontario`,
    description:
      "ICI and multi-unit specialty trades: spray foam insulation, cementitious fireproofing, intumescent coatings, AVB membranes, and SPF roofing across Ontario.",
    images: [socialShareImage.publicPath],
  },
};

assertMarketingClaimsSafe(metadata, "metadata root defaults");

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-CA"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
