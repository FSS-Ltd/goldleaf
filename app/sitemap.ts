import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/how-we-teach", "/about", "/enquire", "/privacy"];
  return paths.map((p) => ({
    url: new URL(p, site.siteUrl).toString(),
    changeFrequency: p === "/" ? "weekly" : "monthly",
    priority: p === "/" ? 1 : p === "/privacy" ? 0.3 : 0.8,
  }));
}
