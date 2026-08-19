# PensionIQ Ireland

> Ireland's pension fund explorer, comparison tool, and retirement calculator.

## Status

The app runs against **real Gemini and Supabase auth** when `.env.local` is populated
(see below), and falls back to fully-working mock mode with zero config otherwise. See
[TODO.md](./TODO.md) for what's still deferred to a later build.

- **Fund data**: Supabase-first, `lib/mock-data.ts`-fallback (`lib/data/funds.server.ts`
  for Server Components, `lib/hooks/use-funds.ts` client-side) — real provider and fund
  names sourced from each provider's public fund centre and the [National Pension
  Helpline fund explorer](https://funds.nationalpensionhelpline.ie) (Aug 2026). The
  fallback is live today (Supabase's schema migration hasn't been applied to this
  project yet, so queries 404 and the app silently uses mock data) and will switch to
  real data automatically once `supabase/migrations/002_scraper_support.sql` is applied
  and `pnpm scrape:funds` has run — see TODO.md items 2-4.
- **Auth**: `lib/supabase/client.ts` falls back to a localStorage-backed mock
  (`lib/supabase/mock-client.ts`) when `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` aren't
  set. With them set, it's a real Supabase project — signup respects your project's
  email-confirmation setting (Supabase's default requires clicking a confirmation link
  before a session is issued; the signup page handles this and shows a "check your
  email" state). Account deletion (Settings) is real too — it calls Supabase's admin API
  via `app/api/account/route.ts`, which needs `SUPABASE_SERVICE_ROLE_KEY`.
- **AI suggestions**: `app/api/ai/suggest/route.ts` calls Gemini (`gemini-3.6-flash`)
  when `GEMINI_API_KEY` is set, otherwise returns a templated response grounded in the
  live-or-mock fund catalog. Responses are capped at ~120 words / 3 bullets and forced to
  plain text (no markdown) since the chat UI intentionally doesn't use
  `dangerouslySetInnerHTML`. The AI Suggestions page discloses upfront that messages are
  sent to Google.
- **Fund scraper**: `scripts/scrape-funds.ts` (Playwright — the source renders fund
  tables client-side, so a plain HTTP fetch can't see them), scheduled via
  `.github/workflows/scrape-funds.yml`. Verified against the live site
  (`pnpm scrape:funds --dry-run`): 136 real funds across all 10 providers.
- **Security**: static CSP + standard security headers (`next.config.ts`), same-origin
  check on the AI route, durable rate limiting (`lib/rate-limit.ts` — Upstash Redis when
  configured, in-memory sliding window otherwise), `error.tsx`/`global-error.tsx`
  boundaries, `/api/health` for uptime checks.
- **Privacy**: `/privacy` policy page (contains `[PLACEHOLDER]`s that need real business
  details before it's legally usable — see TODO.md), Gemini disclosed as a data
  processor, cookie consent logged server-side (best-effort, `app/api/consent/route.ts`)
  in addition to localStorage.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4,
  shadcn/ui, Recharts
- **Backend (when configured):** Supabase (PostgreSQL + Auth + Row Level Security)
- **Package Manager:** pnpm

## Local Setup

### Prerequisites

- Node.js 20.9+
- pnpm (`corepack enable pnpm`)

### Steps

```bash
pnpm install
pnpm dev
```

The app runs at http://localhost:3000 fully in mock mode — browse funds, run the
calculator, chat with the AI suggestions demo, and sign up/log in (stored in your
browser only) without any external services.

### Enabling real services

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Enables live AI suggestions via Gemini instead of templated mock replies |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enables real Supabase auth + fund data instead of the localStorage/mock-data fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | Needed for real account deletion (`app/api/account/route.ts`) and for `pnpm scrape:funds` to write |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Durable rate limiting on the AI route instead of the in-memory fallback |
| `NEXT_PUBLIC_SITE_URL` | Your real domain, used in `metadataBase`/sitemap/robots |

To stand up a real Supabase project: create one at [supabase.com](https://supabase.com)
(EU region recommended), then run `supabase/migrations/001_initial_schema.sql` followed
by `002_scraper_support.sql` via `supabase db push` or the SQL Editor. This creates the
`providers`/`funds`/`fund_prices`/`profiles`/`saved_funds` tables with RLS policies.
Once applied, run `pnpm scrape:funds` (needs `SUPABASE_SERVICE_ROLE_KEY`) to populate
real fund data — the fund pages pick it up automatically, no code changes needed.

## Project Structure

| Purpose | File(s) |
|---|---|
| Mock fund data (fallback) | `lib/mock-data.ts`, `lib/types.ts` |
| Supabase-first fund data access | `lib/data/funds.server.ts` (Server Components), `lib/hooks/use-funds.ts` (Client Components), `lib/supabase/funds-queries.ts`, `lib/supabase/public.ts` |
| Fund scraper | `scripts/scrape-funds.ts`, `.github/workflows/scrape-funds.yml` |
| Tax relief / projection math | `lib/calculations.ts` |
| Supabase clients (real + mock fallback) | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/mock-client.ts`, `lib/supabase/admin.ts` (service-role, server-only) |
| Auth state | `lib/auth-context.tsx` |
| Route protection | `proxy.ts` (Next.js 16's renamed `middleware.ts`), `lib/supabase/middleware.ts` |
| AI suggestions API | `app/api/ai/suggest/route.ts` |
| Account deletion API | `app/api/account/route.ts` |
| Consent logging API | `app/api/consent/route.ts` |
| Durable rate limiting | `lib/rate-limit.ts` |
| DB schema | `supabase/migrations/001_initial_schema.sql`, `002_scraper_support.sql` |
| Privacy policy | `app/privacy/page.tsx` |
| Environment vars | `.env.local.example` |

## GDPR

- **Privacy policy**: `/privacy` — contains `[PLACEHOLDER]`s that need real business
  details filled in before it's legally usable (see TODO.md).
- **Cookie banner**: granular Accept All / Reject / Manage, consent stored in
  localStorage (`lib/consent.ts`, source of truth) and best-effort logged server-side to
  `consent_log` (`app/api/consent/route.ts`) once the schema is applied.
- **Data export**: Settings → Export my data, downloads a JSON file of your account +
  consent state.
- **Account deletion**: Settings → Delete account — real deletion via Supabase's admin
  API (`app/api/account/route.ts`, needs `SUPABASE_SERVICE_ROLE_KEY`) when Supabase is
  configured; clears localStorage in mock mode.
- **AI Suggestions**: discloses upfront that messages are sent to Google's Gemini API.

This is meaningfully better than a UI-only mock, but **not a compliance sign-off** — see
TODO.md §7 for what's still missing (a data retention policy, and the privacy policy's
placeholders need a qualified person's review).

## Data Sources & Attribution

Fund names, providers, categories, and risk ratings are sourced from each provider's
public fund centre and the [National Pension Helpline Fund
Explorer](https://funds.nationalpensionhelpline.ie).

Irish pension tax rules are based on:

- [Revenue.ie](https://www.revenue.ie/en/jobs-and-pensions/pensions/index.aspx) — age-related
  tax relief limits and the earnings cap
- [Pensions Authority](https://www.pensionsauthority.ie) — regulatory information

## Providers Covered

| Provider | Slug |
|---|---|
| Zurich Life | zurich-life |
| Irish Life | irish-life |
| Aviva | aviva |
| Standard Life | standard-life |
| New Ireland | new-ireland |
| Royal London | royal-london |
| Mercer Aspire | mercer-aspire |
| BOI Life | boi-life |
| AIB Life | aib-life |
| Acorn Life | acorn-life |

## License

Private — All rights reserved.
