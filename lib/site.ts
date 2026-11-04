// An empty value (e.g. an unset Docker build argument) counts as unset.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://pensioniq.ie").replace(/\/$/, "");
