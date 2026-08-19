# PensionIQ — Production TODO

The v1 core app (see [README.md](./README.md)) runs fully in mock mode. This document
covers what's needed to go from there to a production deployment, and what was
deliberately left out of v1.

---

## 1. Gemini API Key (live AI suggestions)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create a key.
2. Add it as `GEMINI_API_KEY` in `.env.local` (dev) or your hosting provider's env vars
   (production).
3. Used by `app/api/ai/suggest/route.ts`, model `gemini-2.0-flash`. Without a key, the
   route returns a templated mock response instead — no code change needed either way.
4. Estimated cost: ~$0.10 / 1M input tokens, ~$0.40 / 1M output tokens. A typical query
   (~500 in / ~500 out incl. the fund-catalog system prompt) is roughly $0.0003.

## 2. Supabase (real backend)

1. Create a project at [supabase.com](https://supabase.com) (EU region recommended).
2. From **Settings → API**, copy the Project URL and `anon public` key into
   `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Run `supabase/migrations/001_initial_schema.sql` via `supabase db push` or the SQL
   Editor. This creates `providers`/`funds`/`fund_prices`/`profiles`/`saved_funds`/
   `consent_log` with RLS policies.
4. `lib/supabase/client.ts` and `server.ts` automatically switch from the localStorage
   mock to real Supabase once these env vars are present — no other code changes.
5. Enable the Email auth provider (Authentication → Providers) and set redirect URLs
   for your production domain.

## 3. Wire fund pages to Supabase instead of mock data

`lib/mock-data.ts` is currently the single source of truth for `/funds`, `/funds/[id]`,
and `/compare`. Once the scraper (below) is populating the `funds`/`fund_prices` tables,
replace the imports in those pages with Supabase queries.

## 4. Fund scraper (not built yet)

v1 does not include the `scrape-funds` Supabase Edge Function referenced in the schema
comments. To build it: a Cheerio-based scraper hitting
`funds.nationalpensionhelpline.ie` (or each provider's fund centre directly), writing
into `funds` and `fund_prices`, scheduled via `pg_cron` (commented-out schedule at the
bottom of `001_initial_schema.sql`).

## 5. Deployment (Vercel)

1. Push to GitHub, import into Vercel (Next.js auto-detected).
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `GEMINI_API_KEY`.
3. Update `metadataBase` in `app/layout.tsx` and the URLs in `app/sitemap.ts` /
   `app/robots.ts` once a real domain is set.

## 6. Security checklist

- [x] `GEMINI_API_KEY` never reaches the client (server-only route)
- [x] Supabase RLS policies defined in the migration
- [x] Basic in-memory rate limit on `/api/ai/suggest` (20 req/hr/IP) — replace with a
      durable limiter (Upstash, Vercel) before production; it resets on server restart
- [ ] CSRF protection for form submissions
- [ ] Content Security Policy headers
- [ ] Durable rate limiting (see above)
- [x] No `dangerouslySetInnerHTML` — AI chat renders as plain text, not markdown

## 7. Explicitly deferred from v1 (not started)

- Blog / long-form SEO content pages
- `public/llms.txt` and other GEO (generative-engine-optimization) content strategy
- Real-time fund alerts, portfolio tracker, PDF export of projections
- Multi-language support
- Server-side GDPR consent logging (`consent_log` table exists in the schema but
  nothing writes to it yet — v1's cookie banner only writes to localStorage)
- Real account deletion for Supabase-backed accounts (mock mode deletes the local
  record; real mode needs a service-role admin API call)
- Analytics/monitoring integration (Vercel Analytics, PostHog, Sentry)
- State Pension calculator, employer contribution calculator
