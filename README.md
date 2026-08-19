# PensionIQ Ireland

> Ireland's pension fund explorer, comparison tool, and retirement calculator.

## Status

This is the **v1 core app**, running entirely in mock mode: no Supabase project or Gemini
API key is required to run it locally. See [TODO.md](./TODO.md) for what's deferred to a
production build.

- **Fund data**: `lib/mock-data.ts` — real provider and fund names sourced from each
  provider's public fund centre and the [National Pension Helpline fund
  explorer](https://funds.nationalpensionhelpline.ie) (Aug 2026). 1/3/5-year returns are
  illustrative figures generated from each fund's real risk rating, not live NAV data —
  live performance requires the scraper described in TODO.md.
- **Auth**: `lib/supabase/client.ts` falls back to a localStorage-backed mock
  (`lib/supabase/mock-client.ts`) when `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` aren't
  set. Add real env vars and the same file returns a real Supabase client — no code
  changes needed.
- **AI suggestions**: `app/api/ai/suggest/route.ts` calls Gemini (`gemini-2.0-flash`)
  when `GEMINI_API_KEY` is set, otherwise returns a templated response grounded in the
  mock fund catalog.

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
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enables real Supabase auth instead of the localStorage mock |
| `SUPABASE_SERVICE_ROLE_KEY` | Reserved for future server-side admin operations (scraper, etc.) |

To stand up a real Supabase project: create one at [supabase.com](https://supabase.com)
(EU region recommended), then run the schema in
`supabase/migrations/001_initial_schema.sql` via `supabase db push` or the SQL Editor.
This creates the target `providers`/`funds`/`fund_prices`/`profiles`/`saved_funds`
tables with RLS policies — nothing in the app reads from these tables yet since the
mock data layer is still primary; wiring the fund pages to Supabase instead of
`lib/mock-data.ts` is tracked in TODO.md.

## Project Structure

| Purpose | File(s) |
|---|---|
| Mock fund data | `lib/mock-data.ts`, `lib/types.ts` |
| Tax relief / projection math | `lib/calculations.ts` |
| Supabase clients (real + mock fallback) | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/mock-client.ts` |
| Auth state | `lib/auth-context.tsx` |
| Route protection | `proxy.ts` (Next.js 16's renamed `middleware.ts`), `lib/supabase/middleware.ts` |
| AI suggestions API | `app/api/ai/suggest/route.ts` |
| Target production DB schema | `supabase/migrations/001_initial_schema.sql` |
| Environment vars | `.env.local.example` |

## GDPR (UI-level in v1)

- **Cookie banner**: granular Accept All / Reject / Manage, consent stored in
  localStorage (`lib/consent.ts`)
- **Data export**: Settings → Export my data, downloads a JSON file of your account +
  consent state
- **Account deletion**: Settings → Delete account, two-step confirmation
- Server-side consent logging and real account deletion require the Supabase schema
  above and are tracked in TODO.md — the mock layer only clears local/browser state.

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
