import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private pages and APIs: nothing there for search results.
        disallow: ["/api/", "/portfolio", "/settings", "/auth/", "/verify-email", "/unsubscribe"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
