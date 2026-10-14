import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export const MARKETING_ROUTES = [
  "/",
  "/about",
  "/services",
  "/services/spray-foam-insulation",
  "/services/fire-protection",
  "/services/air-vapour-barriers",
  "/services/waterproofing",
  "/services/firestopping",
  "/projects",
  "/partners",
  "/locations",
  "/contact",
  "/request-estimate",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_ROUTES.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}`,
    changeFrequency: path === "/privacy" || path === "/terms" ? "yearly" : "monthly",
    priority: path === "/" ? 1 : path === "/privacy" || path === "/terms" ? 0.3 : 0.7,
  }));
}
