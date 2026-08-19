import type { MetadataRoute } from "next";
import { funds } from "@/lib/mock-data";

const BASE_URL = "https://pensioniq.ie";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/funds",
    "/compare",
    "/calculator",
    "/ai-suggestions",
    "/how-it-works",
    "/login",
    "/signup",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  const fundRoutes = funds.map((fund) => ({
    url: `${BASE_URL}/funds/${fund.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...fundRoutes];
}
