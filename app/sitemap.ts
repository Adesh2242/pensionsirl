import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/data/funds.server";
import { SITE_URL as BASE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Every public page. Fund pages (and the lists built from them) change when
 * the weekly fund update runs, so they carry that date; other pages carry
 * no date rather than a made-up one.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { funds, lastScrapeTime } = await getCatalog();
  const updated = lastScrapeTime ? new Date(lastScrapeTime) : undefined;

  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly"; data?: boolean }[] = [
    { path: "", priority: 1, changeFrequency: "weekly", data: true },
    { path: "/funds", priority: 0.9, changeFrequency: "weekly", data: true },
    { path: "/pensions-explained", priority: 0.9, changeFrequency: "monthly" },
    { path: "/calculator", priority: 0.8, changeFrequency: "monthly" },
    { path: "/compare", priority: 0.7, changeFrequency: "weekly", data: true },
    { path: "/ai-suggestions", priority: 0.5, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  ];

  return [
    ...pages.map((p) => ({
      url: `${BASE_URL}${p.path}`,
      lastModified: p.data ? updated : undefined,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...funds.map((fund) => ({
      url: `${BASE_URL}/funds/${fund.slug}`,
      lastModified: updated,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
