/**
 * Applies db/migrations/*.sql in order, once each, recording them in
 * schema_migrations. Runs as Railway's pre-deploy command (and from
 * docker compose locally), so a deploy never starts on an old schema. Each
 * file runs in a transaction: it applies fully or not at all.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const dir = process.env.MIGRATIONS_DIR ?? join(process.cwd(), "db", "migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, { max: 1, ssl: /sslmode=require/.test(url) ? "require" : false, onnotice: () => {} });
  try {
    // Two deploys starting together mustn't both migrate.
    await sql`select pg_advisory_lock(727274)`;
    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const applied = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      console.log(`migrate: applying ${file}`);
      await sql.begin(async (t) => {
        const tx = t as unknown as typeof sql;
        await tx.unsafe(readFileSync(join(dir, file), "utf8"));
        await tx`insert into schema_migrations (name) values (${file})`;
      });
      count++;
    }
    console.log(count ? `migrate: ${count} applied.` : "migrate: up to date.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("migrate: failed —", error);
  process.exit(1);
});
