import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      // SPF roofing was removed from the service line (2026-10-14).
      { source: "/services/spf-roofing", destination: "/services", permanent: true },
    ];
  },
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas", "postgres"],
  experimental: {
    serverActions: {
      // Demo mode posts files through a Server Action. Production uploads go
      // directly to private Blob storage, avoiding function body limits.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;

void initOpenNextCloudflareForDev();
