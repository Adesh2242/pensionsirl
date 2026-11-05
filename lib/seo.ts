import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Search-engine helpers: per-page metadata with a canonical URL, and
 * schema.org JSON-LD. Canonical URLs matter here because the same site is
 * reachable on more than one address (the Railway one and the real domain);
 * they tell Google which to index.
 */

export const SITE_NAME = "PensionIQ";

export function pageMetadata(input: {
  title: string;
  description: string;
  /** The page's path, e.g. "/funds". */
  path: string;
  /** Private or utility pages: keep them out of search results. */
  noindex?: boolean;
  /** The share image; the site-wide card unless the page has its own. */
  image?: string;
}): Metadata {
  const { title, description, path, noindex, image = "/opengraph-image" } = input;
  const full = `${title} | ${SITE_NAME}`;
  return {
    // Absolute, with the template restated: a layout's plain title would
    // otherwise drop the site name from the pages below it.
    title: { absolute: full, template: `%s | ${SITE_NAME}` },
    description,
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, siteName: SITE_NAME, locale: "en_IE", type: "website", images: image },
    twitter: { card: "summary_large_image", title: full, description, images: image },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

/** Breadcrumbs as schema.org BreadcrumbList; the home page is added first. */
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
