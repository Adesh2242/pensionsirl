#
# One image for everything PensionIQ runs on Railway:
#   web      node server.js              (Next.js standalone server)
#   migrate  node dist/migrate.mjs       (pre-deploy: applies db/migrations)
#   scrape   node dist/scrape-funds.mjs  (weekly cron service)
#
# Builds without any secrets: nothing touches the database at build time.

# Overridable so a build can use a mirror of the same official image.
ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@11.22.0 && npm cache clean --force

# ── dependencies (cached until the lockfile changes) ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# A flat node_modules: Next's standalone file tracing misses files behind
# pnpm's default symlinked layout.
RUN pnpm install --frozen-lockfile --config.node-linker=hoisted

# ── build ──
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public, non-secret: the site's own address, inlined into metadata.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
# `npm run`, not `pnpm run`: pnpm re-checks installs before running scripts
# and would swap the flat node_modules back to its symlinked layout.
RUN npm run build && npm run build:jobs

# ── runtime: only the traced server, static assets, jobs and migrations ──
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/db ./db
USER node
EXPOSE 8080
CMD ["node", "server.js"]
