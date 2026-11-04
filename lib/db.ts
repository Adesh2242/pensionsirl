import "server-only";
import postgres from "postgres";

/**
 * The one Postgres connection pool for the app. DATABASE_URL comes from the
 * Railway Postgres service (private network). Without it the site still
 * renders — funds fall back to the bundled dataset — but accounts and
 * portfolios are unavailable.
 */
type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { __pensioniqSql?: Sql | null };

function connect(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    idle_timeout: 30,
    connect_timeout: 10,
    // Railway's private network is unencrypted-by-design inside the project;
    // a public URL (e.g. local tooling) asks for TLS with ?sslmode=require.
    ssl: /sslmode=require/.test(url) ? "require" : false,
    // numeric columns come back as strings; convert where read.
  });
}

// Reuse one pool across hot reloads in development.
export const sql: Sql | null = globalForDb.__pensioniqSql ?? (globalForDb.__pensioniqSql = connect());

export function isDatabaseConfigured(): boolean {
  return sql !== null;
}

/** For code paths that make no sense without a database (accounts, portfolio). */
export function requireSql(): Sql {
  if (!sql) throw new Error("DATABASE_URL is not set.");
  return sql;
}
