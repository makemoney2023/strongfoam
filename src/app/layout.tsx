import type { Metadata } from "next";
import { Archivo, Source_Sans_3 } from "next/font/google";
import { site } from "@/content/site";
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
    "ICI and multi-unit specialty trades: spray foam insulation, cementitious fireproofing, intumescent coatings, AVB membranes, waterproofing, and firestopping across Ontario.",
  alternates: { canonical: "/" },
  applicationName: site.brand,
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "https://strongfoam.com",
    siteName: site.brand,
    title: `${site.brand} — commercial spray foam & fire protection Ontario`,
    description: "ICI and multi-unit specialty trades: spray foam insulation, cementitious fireproofing, intumescent coatings, AVB membranes, waterproofing, and firestopping across Ontario.",
    images: [{ url: "https://strongfoam.com/og-image.png", width: 1200, height: 630, alt: `${site.brand} — commercial spray foam & fire protection in Ontario` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.brand} — commercial spray foam & fire protection Ontario`,
    description: "ICI and multi-unit specialty trades: spray foam insulation, cementitious fireproofing, intumescent coatings, AVB membranes, waterproofing, and firestopping across Ontario.",
    images: ["https://strongfoam.com/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
