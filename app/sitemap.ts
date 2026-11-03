import type { MetadataRoute } from "next";
import { getAllFunds } from "@/lib/data/funds.server";
import { SITE_URL as BASE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const funds = await getAllFunds();
  const staticRoutes = [
    "",
    "/funds",
    "/compare",
    "/calculator",
    "/ai-suggestions",
    "/how-it-works",
    "/privacy",
    "/terms",
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
