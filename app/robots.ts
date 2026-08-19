import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/settings"],
      },
    ],
    sitemap: "https://pensioniq.ie/sitemap.xml",
  };
}
