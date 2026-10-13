import type { MetadataRoute } from "next";
import { publicRoutes, site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path }) => ({
    url: path === "/" ? site.url : `${site.url}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/request-estimate" ? 0.9 : 0.8,
  }));
}
