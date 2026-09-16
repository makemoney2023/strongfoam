import type { Metadata } from "next";
import { Archivo, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
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
    "ICI and multi-unit specialty trades: spray foam insulation, cementitious fireproofing, intumescent coatings, AVB membranes, and SPF roofing across Ontario.",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-CA"
      className={`${display.variable} ${sans.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
