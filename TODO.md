# PensionIQ — Production TODO

This document covers what's needed to take the app the rest of the way to production,
and what was deliberately left out of v1. Gemini and Supabase auth are **already wired
up and live** (see status below) — this is what's still outstanding.

---

## 1. Gemini API key — DONE (live)

`.env.local` has a working `GEMINI_API_KEY`, verified with real requests. One thing
worth knowing: the key did not work with `gemini-2.0-flash` (Google has retired it —
the API now returns 404 and points to `gemini-3.6-flash`), so `app/api/ai/suggest/route.ts`
was updated to use `gemini-3.6-flash`. That model does extended "thinking" by default
(had to set `thinkingConfig.thinkingBudget: 128` and raise `maxOutputTokens` to 1600 to
stop responses being cut off mid-sentence); typical response time is ~15-20s, which is
slow for chat UX but acceptable with the "Thinking…" indicator already in the UI. If
Google ships a lighter/faster model variant, swap `GEMINI_MODEL` for it.

Estimated cost: ~$0.10 / 1M input tokens, ~$0.40 / 1M output tokens. A typical query is
a few hundred output tokens, so cost per query is a fraction of a cent even with the
thinking overhead.

## 2. Supabase — auth is DONE (live), schema/data is NOT

`.env.local` has real `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
verified with a real signup (Supabase itself rejected `@example.com` as invalid, then
accepted a real-looking address — confirming the live API is actually being hit, not a
mock). `lib/supabase/client.ts`/`server.ts` auto-switch off the localStorage mock the
moment these env vars are present.

Two things learned from live testing that the code now handles:
- **Email confirmation**: this Supabase project has email confirmation enabled
  (Supabase's default) — `signUp()` returns a user but no session until the
  confirmation link is clicked. `app/signup/page.tsx` now detects `!data.session` and
  shows a "check your email" screen instead of silently redirecting home as if logged in.
- **Schema not applied yet**: `supabase/migrations/001_initial_schema.sql` has **not**
  been run against this project — I only have the publishable/anon key, which can't run
  DDL. Auth works fine without it (Supabase Auth doesn't need app tables), but
  `saved_funds`/`consent_log`/`providers`/`funds` tables don't exist yet. To apply it:
  paste the file into the Supabase Dashboard → SQL Editor → Run, or give me a DB
  connection string / the CLI access token if you want me to run it.
- Enable the Email provider's redirect URL for your real production domain once you
  have one (Authentication → URL Configuration) — currently whatever Supabase defaults
  to will be used for the confirmation link.

## 3. Wire fund pages to Supabase — DONE (code), waiting on #2's migration

`/funds`, `/funds/[id]`, `/compare`, the AI suggestions catalog, and `sitemap.ts` all now
query Supabase first and fall back to `lib/mock-data.ts` — verified live: the fallback
correctly kicks in today (Supabase queries 404 with `PGRST205` since the migration
hasn't been applied), and will silently switch to live data the moment
`002_scraper_support.sql` is applied and the scraper has run, with no further code
changes.

- Server Components (`/funds/[id]`, `sitemap.ts`): `lib/data/funds.server.ts`, using a
  cookie-free public client (`lib/supabase/public.ts`) — funds/providers are public-read
  data, and `generateStaticParams` runs at build time with no request context, so the
  cookie-aware `lib/supabase/server.ts` client can't be used there (learned this the hard
  way: it threw `used cookies() inside generateStaticParams` until fixed).
- Client Components (`/funds`, `/compare`): `lib/hooks/use-funds.ts` — starts with mock
  data (no loading flicker), swaps to live data in the background if Supabase returns
  rows.
- `AMC` is now `amc?: number` (`lib/types.ts`) — the live scrape source doesn't publish
  it, only the curated mock dataset does. UI shows "—" via `formatAmc()` when absent.

## 4. Fund scraper — DONE (code), verified against the live site, not yet run for real

`scripts/scrape-funds.ts` — **not** a Cheerio HTTP scraper as originally planned: the
fund tables on `funds.nationalpensionhelpline.ie` are rendered client-side (confirmed by
inspecting the raw HTML response, which has no fund data in it), so it uses Playwright
to render the page and read the table DOM. *(Since replaced: it now reads each
provider page's RSC payload with a plain `fetch()` — see README. It runs weekly,
**Mondays 06:00 UTC**, as a Netlify scheduled function,
`netlify/functions/scrape-funds.mts`. It used to be a GitHub Actions cron, which
never ran because of a billing lock on the GitHub account.)*

Verified with `pnpm scrape:funds --dry-run` against the real site: scraped **136 real
funds** across all 10 providers with actual risk ratings, categories, and 1yr/5yr/10yr
returns. Without `SUPABASE_SERVICE_ROLE_KEY` set, it automatically runs in dry-run mode
(scrapes and prints a summary, writes nothing) — I don't have that key, so I could not
verify the actual Supabase write path, only the scraping/parsing logic. To go live:

1. Apply `supabase/migrations/002_scraper_support.sql` then `003_scrape_log_rls.sql`
   (adds `subcategory`, `ten_year_return`, makes `amc`/`nav` nullable, adds the
   `fund_prices_latest` view, and — a pre-existing gap in 001 I caught while wiring up
   the "last updated" display — enables RLS on `scrape_log`, which had none).
2. Add `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` to the site's Netlify
   environment variables (Site configuration → Environment variables).
3. Run it once from Netlify (Logs → Functions → `scrape-funds` → Run now) or with
   `pnpm scrape:funds` locally to confirm the write path works, then let the weekly
   schedule take over.

**"Fund data last updated" display**: `/funds` and `/funds/[id]` read the latest
successful `scrape_log.finished_at` (via `fetchLastScrapeTime` in
`lib/supabase/funds-queries.ts`) and show it once live data is active — shows nothing in
mock mode, since there's nothing to date.

Notes on data fidelity: the source publishes 1yr/5yr/10yr returns, not 3yr — the app's
3yr figure is linearly interpolated when data comes from the scraper (see
`lib/supabase/funds-queries.ts`, clearly commented, and the fund detail page labels it
"3 years (interpolated)" for live data). AMC and NAV aren't published by this source at
all, so those columns will be `null` for scraped funds — only the original 112 curated
mock funds have AMC estimates.

## 5. Deployment (Vercel)

1. Push to GitHub, import into Vercel (Next.js auto-detected).
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `GEMINI_API_KEY`, `NEXT_PUBLIC_SITE_URL` (your real domain, e.g. `https://pensioniq.ie`).
3. `metadataBase`, `app/sitemap.ts`, and `app/robots.ts` all read `NEXT_PUBLIC_SITE_URL`
   (falls back to `https://pensioniq.ie` if unset) — just set the env var, no code
   changes needed.

## 6. Security checklist

- [x] `GEMINI_API_KEY` never reaches the client (server-only route)
- [x] Supabase RLS policies defined in the migration (not yet applied — see #2)
- [x] **Durable rate limiting** on `/api/ai/suggest` (20 req/hr/IP): `lib/rate-limit.ts`
      uses Upstash Redis (`Ratelimit.slidingWindow`) when `UPSTASH_REDIS_REST_URL` /
      `_TOKEN` are set, else the original in-memory sliding window (resets on restart,
      doesn't share state across instances — fine for dev/single-instance, not for
      multi-instance production). Verified the in-memory path directly: exactly 20
      requests allowed, 21st+ blocked. Haven't verified the Upstash path — no account/
      credentials for it; give me `UPSTASH_REDIS_REST_URL`/`_TOKEN` (free tier at
      upstash.com) if you want that confirmed live.
- [x] Same-origin check on `/api/ai/suggest` (rejects cross-origin `Origin` headers) —
      lightweight CSRF mitigation; full CSRF protection would also cover any future
      cookie-authenticated form POSTs
- [x] Content Security Policy + security headers (`next.config.ts`): CSP (static, no
      nonce — keeps the 112 SSG fund pages static), `X-Frame-Options`,
      `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
      `Strict-Transport-Security`, `poweredByHeader: false`. CSP's `connect-src`
      dynamically includes the configured Supabase origin (`lib/site.ts` pattern) —
      if `NEXT_PUBLIC_SUPABASE_URL` changes, the header picks it up automatically.
      `script-src`/`style-src` still allow `'unsafe-inline'` (Next's own documented
      "without nonces" pattern); a nonce-based CSP would be stricter but forces
      full-app dynamic rendering, killing the static fund pages — not worth it here.
- [x] No `dangerouslySetInnerHTML` — AI chat renders as plain text, not markdown (the
      Gemini system prompt now explicitly forbids markdown output to match)
- [x] `error.tsx` / `global-error.tsx` boundaries so unhandled errors show a real page
      instead of a blank screen or default Next.js overlay in production
- [x] `/api/health` endpoint (reports whether Supabase/Gemini are configured) for
      uptime monitoring on whatever platform you deploy to

## 7. GDPR compliance status (audited 2026-08-19)

- [x] **Real account deletion**: `app/api/account/route.ts` (DELETE) verifies the
      caller's session server-side, then uses a service-role admin client
      (`lib/supabase/admin.ts`, needs `SUPABASE_SERVICE_ROLE_KEY`) to actually delete
      the Supabase Auth user — not just sign them out. Settings page now surfaces a
      real error if the service role key isn't configured, instead of silently
      pretending to succeed.
- [x] **Privacy policy** at `/privacy`, linked from the footer, cookie banner, and AI
      Suggestions page. Contains `[PLACEHOLDER]` markers for things that need real
      business input before this is legally usable: legal entity name, registered
      address, privacy contact email, Supabase hosting region confirmation, the
      specific international-transfer mechanism relied on for Gemini, and a defined
      data retention period. **Do not treat this as compliant until a qualified person
      fills these in and reviews the page.**
- [x] **Gemini disclosed as a data processor** — both in the privacy policy (§4) and
      as an inline notice on the AI Suggestions page itself, before the user types
      anything.
- [x] **Server-side consent logging**: `app/api/consent/route.ts` — the cookie banner
      (`lib/consent.ts`) writes to localStorage as before (still the source of truth for
      the user's actual consent state) and now also fire-and-forgets a POST to this
      route, which logs `{user_id, necessary, analytics, identifier_hash}` to
      `consent_log`. No raw IP is stored, per the schema's design — only a salted SHA-256
      hash of it. Verified live: fails gracefully today (`consent_log` doesn't exist
      until the migration is applied) and the banner is unaffected either way — checked
      in a real browser that Accept All produces zero console errors.
- [ ] Data retention policy — not defined or enforced anywhere yet (see privacy policy
      §7 placeholder)
- [ ] Cookie banner "Manage" only exposes a necessary/analytics toggle — fine for
      current cookie usage (there are no analytics cookies actually set yet), revisit
      if/when real analytics are added

## 8. Other explicitly deferred from v1 (not started)

- Blog / long-form SEO content pages
- `public/llms.txt` and other GEO (generative-engine-optimization) content strategy
- Real-time fund alerts, portfolio tracker, PDF export of projections
- Multi-language support
- Analytics/monitoring integration (Vercel Analytics, PostHog, Sentry)
- State Pension calculator, employer contribution calculator
