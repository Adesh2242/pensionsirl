# PensionIQ Ireland

> Ireland's pension fund explorer, comparison tool, retirement calculator and personal pension portfolio.

## How it runs

Live at **https://web-production-5c33b.up.railway.app**. Everything runs in containers
on **Railway**, in its EU region (Amsterdam).

| Service | What it runs | Notes |
|---|---|---|
| `web` | `node server.js` — the Next.js standalone server | Pre-deploy: `node dist/migrate.mjs`. Healthcheck: `/api/health` |
| `scrape` | `node dist/scrape-funds.mjs` — the weekly fund update | Cron `0 6 * * 1` (Mondays 06:00 UTC), same image |
| `Postgres` | Railway's Postgres | Reached over the private network as `DATABASE_URL` |

All three come from one image built by the `Dockerfile`. Nothing touches the database
at build time, so the build needs no secrets.

- **Accounts** — our own email/password sign-in (`app/api/auth/*`, `lib/auth/*`):
  scrypt password hashes, random session tokens in an HTTP-only `SameSite=Lax` cookie
  with only their SHA-256 stored, rate-limited logins, and a same-origin check on every
  write. Accounts migrated from Supabase keep their bcrypt hash until their next login,
  when it's upgraded to scrypt. "Continue with Google" switches on when
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set.
- **Data** — browsers never talk to the database. Fund data comes from the server
  (`lib/data/fund-repo.ts`, cached five minutes in `lib/data/funds.server.ts`) and
  `/api/funds`. Portfolio holdings go through `/api/holdings`, scoped to the session's
  user in every query (`lib/portfolio/repo.ts`). Without a database the site still
  renders on the bundled sample funds (`lib/mock-data.ts`), with accounts switched off.
- **Schema** — `db/migrations/*.sql`, applied in order by `scripts/migrate.ts`, which
  records them in `schema_migrations`.
- **Fund scraper** — `lib/scraper/scrape-funds.ts` reads each provider page's Next.js
  payload on the National Pension Helpline site (388 funds across 10 providers). A run
  that scrapes 0 funds fails rather than recording a success. The same job applies data
  retention: consent records after 24 months, expired sessions.
- **AI suggestions** — Gemini when `GEMINI_API_KEY` is set, otherwise built-in search
  over the catalogue.
- **Exports** — PDF reports (with charts) and CSV from the calculator and portfolio,
  generated in the browser.

## Local setup

```bash
docker compose up --build              # site on http://localhost:3000, with Postgres
docker compose run --rm scrape         # load live fund data
```

Or without Docker: Node 22+ and pnpm, a Postgres, then

```bash
pnpm install
cp .env.local.example .env.local       # set DATABASE_URL
pnpm migrate && pnpm scrape:funds
pnpm dev
```

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | web, scrape, prices | `${{Postgres.DATABASE_URL}}` on Railway |
| `CONSENT_HASH_SALT` | web | Salt for hashing IPs in the cookie-consent log |
| `NEXT_PUBLIC_SITE_URL` | web, prices | Public address (metadata, sitemap, Google sign-in, links in emails) |
| `EMAIL_API_KEY` | web, prices | Optional: Resend sending-only key for confirmation links and emailed reports |
| `EMAIL_FROM` | web, prices | Optional: sender, default `PensionIQ <reports@pensionwise.ie>` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | web | Optional: Google sign-in (redirect URI `<site>/auth/callback`) |
| `GEMINI_API_KEY` | web | Optional: live AI suggestions |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | web | Optional: rate limits shared across replicas |

## Emailed reports

Signed-in users can have their portfolio PDF emailed monthly, quarterly or yearly (on the
1st), or send one now, from the portfolio page. Reports only go to a confirmed address
(Google sign-ins count as confirmed; password accounts click an emailed link). The
daily `prices` cron service runs `node dist/send-reports.mjs` straight after the price update
(start command `sh -c "node dist/update-benchmarks.mjs; node dist/send-reports.mjs"`, 21:30 UTC); it claims each due schedule
before sending, so a rerun never double-sends, and a failed send is retried the next day.
Every email has a one-click unsubscribe link (`/unsubscribe`).

## Security & GDPR

- Strict CSP and security headers (`next.config.ts`), same-origin checks on every write,
  rate limits on sign-up, login, AI and consent.
- Data stored and processed in the EU (Railway, Amsterdam). Privacy policy at `/privacy`
  (controller details still `[PLACEHOLDER]`), terms & disclaimer at `/terms`.
- Settings → export everything (JSON, holdings as CSV), change cookie choices, or delete
  the account — which removes holdings, sessions and consent records immediately.

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
